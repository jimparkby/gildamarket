/**
 * Gilda Market — Telegram Admin Bot
 *
 * Отправляет уведомление в ADMIN_REVIEW_CHAT_ID при добавлении нового товара.
 * Модератор может:
 *   ✅ Одобрить   — товар становится видимым в ленте
 *   🗑️ Удалить   — удаляет только товар, уведомляет продавца с причиной
 *   🚫 Забанить  — удаляет пользователя и все его данные
 */

let TelegramBot;
try {
  TelegramBot = require('node-telegram-bot-api');
} catch {
  console.warn('[AdminBot] node-telegram-bot-api не установлен — бот отключён. Запустите npm install.');
}

const { PrismaClient } = require('@prisma/client');
const resolveUrl = require('../utils/resolveUrl');

const prisma = new PrismaClient();

/** @type {import('node-telegram-bot-api')|null} */
let bot = null;

// ── In-memory хранилище базовых подписей для review-сообщений ─────────────────
// key: `${chatId}:${messageId}` → исходный caption (без статусной строки)
const reviewCaptions = new Map();

function msgKey(chatId, messageId) {
  return `${chatId}:${messageId}`;
}

// ── Флаги причин отклонения ───────────────────────────────────────────────────
const OPT_BAD_PHOTO  = 1; // Плохое/неподходящее фото
const OPT_WRONG_INFO = 2; // Неверное описание или цена
const OPT_PROHIBITED = 4; // Запрещённый товар

const OPT_ORDER = [OPT_BAD_PHOTO, OPT_WRONG_INFO, OPT_PROHIBITED];

const OPT_BUTTON_LABELS = {
  [OPT_BAD_PHOTO]:  'плохое фото',
  [OPT_WRONG_INFO]: 'неверное описание',
  [OPT_PROHIBITED]: 'запрещённый товар',
};

// Строки для сообщения пользователю при удалении товара
const OPT_USER_LINES = {
  [OPT_BAD_PHOTO]:
    '📷 <b>Фотографии товара</b> — снимки не показывают товар, слишком низкое качество или на фото посторонние предметы.',
  [OPT_WRONG_INFO]:
    '📝 <b>Описание или цена</b> — информация о товаре недостаточна, некорректна или не соответствует фото.',
  [OPT_PROHIBITED]:
    '🚫 <b>Запрещённый товар</b> — такие товары нельзя продавать на нашей площадке.',
};

// ── Утилиты ───────────────────────────────────────────────────────────────────

function esc(text) {
  if (!text) return '—';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildItemCaption(item) {
  const seller = item.seller;
  const sellerHandle = seller?.telegramUsername
    ? `@${seller.telegramUsername}`
    : `id ${seller?.id ?? '—'}`;
  const sellerName = seller
    ? [seller.firstName, seller.lastName].filter(Boolean).join(' ') || '—'
    : '—';

  const price = `${parseFloat(item.price).toLocaleString('ru-RU')} ${item.currency}`;

  const lines = [
    `🆕 <b>Новый товар — уже в ленте</b>`,
    ``,
    `🏷 <b>${esc(item.title)}</b> — ${price}`,
    `📦 Категория: ${esc(item.category)}`,
  ];
  if (item.brand)       lines.push(`👑 Бренд: ${esc(item.brand)}`);
  if (item.size)        lines.push(`📏 Размер: ${esc(item.size)}`);
  if (item.description) lines.push(``, `📝 <i>${esc(item.description)}</i>`);
  lines.push(``, `🛍 Продавец: ${sellerHandle} (${esc(sellerName)})`);

  return lines.join('\n');
}

function buildKeyboard(itemId, sellerId, flags) {
  function optText(opt) {
    return (flags & opt) ? `➕ ${OPT_BUTTON_LABELS[opt]}` : OPT_BUTTON_LABELS[opt];
  }

  return {
    inline_keyboard: [
      [
        { text: '✅ Одобрено (верифицировать)', callback_data: `ia:${itemId}` },
      ],
      [
        { text: '🗑 Удалить из ленты',         callback_data: `id:${itemId}:${flags}` },
      ],
      [{ text: optText(OPT_BAD_PHOTO),    callback_data: `io:${itemId}:${flags}:${OPT_BAD_PHOTO}` }],
      [{ text: optText(OPT_WRONG_INFO),   callback_data: `io:${itemId}:${flags}:${OPT_WRONG_INFO}` }],
      [{ text: optText(OPT_PROHIBITED),   callback_data: `io:${itemId}:${flags}:${OPT_PROHIBITED}` }],
      [{ text: '🚫 Забанить пользователя', callback_data: `ib:${sellerId}:${itemId}` }],
    ],
  };
}

function formatSelectedLine(flags) {
  const selected = OPT_ORDER.filter(opt => flags & opt).map(opt => OPT_BUTTON_LABELS[opt]);
  return selected.length ? `Причины: ${selected.join(', ')}` : 'Причины не выбраны';
}

function getAdminName(from) {
  return from.username ? `@${from.username}` : `id${from.id}`;
}

// ── Уведомления пользователю ──────────────────────────────────────────────────

function buildDeclineNotification(itemTitle, flags) {
  const reasons = OPT_ORDER
    .filter(opt => flags & opt)
    .map(opt => `• ${OPT_USER_LINES[opt]}`);

  const reasonsBlock = reasons.length
    ? reasons.join('\n\n')
    : `• Товар не соответствует правилам площадки.`;

  return [
    `Привет! 👋`,
    ``,
    `Мы проверили твой товар <b>«${esc(itemTitle)}»</b> и, к сожалению, не смогли его одобрить.`,
    ``,
    `<b>Причина(ы):</b>`,
    ``,
    reasonsBlock,
    ``,
    `💡 <b>Что делать дальше?</b>`,
    `Исправь указанные недочёты и добавь товар снова — мы с удовольствием разместим его в каталоге! 🛍`,
    ``,
    `Если появятся вопросы, напиши нам. 🤝`,
  ].join('\n');
}

const BAN_NOTIFICATION =
  `Привет!\n\n` +
  `Твой аккаунт был заблокирован за нарушение правил площадки.\n\n` +
  `Если считаешь, что произошла ошибка — свяжись с поддержкой.`;

async function notifyUser(telegramUserId, text, parseMode = 'HTML') {
  if (!bot) return;
  try {
    await bot.sendMessage(telegramUserId, text, { parse_mode: parseMode });
  } catch (err) {
    console.warn(`[AdminBot] Не удалось отправить сообщение пользователю ${telegramUserId}:`, err.message);
  }
}

// ── Редактирование admin-сообщения ────────────────────────────────────────────

async function editAdminMessage(chatId, messageId, hasPhoto, text, keyboard) {
  try {
    const opts = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      ...(keyboard ? { reply_markup: keyboard } : {}),
    };
    if (hasPhoto) {
      await bot.editMessageCaption(text, opts);
    } else {
      await bot.editMessageText(text, opts);
    }
    return true;
  } catch (err) {
    console.warn('[AdminBot] Не удалось обновить сообщение:', err.message);
    return false;
  }
}

// ── Обработчики callback-кнопок ───────────────────────────────────────────────

function registerHandlers() {
  // ── /approve_all — Одобрить все pending товары ────────────────────────────────
  bot.onText(/\/approve_all/, async (msg) => {
    const chatId = msg.chat.id;
    const adminChatId = process.env.ADMIN_REVIEW_CHAT_ID;
    if (String(chatId) !== String(adminChatId)) return;

    try {
      const result = await prisma.item.updateMany({
        where: { status: 'pending' },
        data: { status: 'approved' },
      });
      await bot.sendMessage(chatId, `✅ Одобрено ${result.count} товаров со статусом pending.`);
    } catch (err) {
      console.error('[AdminBot] /approve_all error:', err);
      await bot.sendMessage(chatId, `❌ Ошибка: ${err.message}`);
    }
  });

  // ── /start — Приветственное сообщение ────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'друг';
    const appUrl = process.env.MINI_APP_URL || 'https://jimparkby-gildamarket-cfc1.twc1.net';

    const text = [
      `Привет! 🙌🏻`,
      `Это маркетплейс нового формата.`,
      ``,
      `Создавай свой магазин 🛒`,
      `Находи уникальные вещи 🖤`,
      `Подписывайся на любимых продавцов`,
    ].join('\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🛍 Открыть Gilda Market', web_app: { url: appUrl } },
        ]],
      },
    });
  });

  bot.on('callback_query', async (query) => {
    const data = query.data || '';
    const msg = query.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const hasPhoto = !!(msg.photo?.length);
    const key = msgKey(chatId, messageId);

    // ── ✅ ia:{itemId} — Одобрить ──────────────────────────────────────────────
    if (data.startsWith('ia:')) {
      const itemId = parseInt(data.slice(3));

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: { seller: true },
      });
      if (!item) {
        return bot.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }

      try {
        await prisma.item.update({ where: { id: itemId }, data: { status: 'approved' } });
      } catch (err) {
        console.error('[AdminBot] Ошибка одобрения:', err);
        return bot.answerCallbackQuery(query.id, { text: 'Ошибка при одобрении', show_alert: true });
      }

      const admin = getAdminName(query.from);
      const base = reviewCaptions.get(key) || buildItemCaption(item);
      await editAdminMessage(chatId, messageId, hasPhoto, `✅ Одобрено: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);
      return bot.answerCallbackQuery(query.id, { text: 'Товар одобрен ✅' });
    }

    // ── io:{itemId}:{flags}:{option} — Переключить причину ───────────────────
    if (data.startsWith('io:')) {
      const parts = data.split(':');
      const itemId = parseInt(parts[1]);
      const flags  = parseInt(parts[2]);
      const option = parseInt(parts[3]);

      if (!OPT_ORDER.includes(option)) {
        return bot.answerCallbackQuery(query.id, { text: 'Неизвестная опция', show_alert: true });
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: { seller: true },
      });
      if (!item) {
        return bot.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }

      const newFlags = flags ^ option;

      let base = reviewCaptions.get(key);
      if (!base) {
        base = buildItemCaption(item);
        reviewCaptions.set(key, base);
      }

      const statusLine = formatSelectedLine(newFlags);
      const newCaption = `${statusLine}\n\n${base}`;
      const keyboard = buildKeyboard(itemId, item.sellerId, newFlags);

      const ok = await editAdminMessage(chatId, messageId, hasPhoto, newCaption, keyboard);
      if (!ok) return bot.answerCallbackQuery(query.id, { text: 'Не удалось обновить', show_alert: true });
      return bot.answerCallbackQuery(query.id, { text: 'Обновлено' });
    }

    // ── 🗑 id:{itemId}:{flags} — Удалить товар ────────────────────────────────
    if (data.startsWith('id:')) {
      const parts = data.split(':');
      const itemId = parseInt(parts[1]);
      const flags  = parseInt(parts[2]);

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: { seller: true },
      });
      if (!item) {
        return bot.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }

      try {
        await prisma.item.delete({ where: { id: itemId } });
      } catch (err) {
        console.error('[AdminBot] Ошибка удаления товара:', err);
        return bot.answerCallbackQuery(query.id, { text: 'Ошибка при удалении', show_alert: true });
      }

      const admin = getAdminName(query.from);
      const selectedFlags = OPT_ORDER.filter(opt => flags & opt);
      const reasonLabel = selectedFlags.length
        ? selectedFlags.map(f => OPT_BUTTON_LABELS[f]).join(', ')
        : 'без причины';
      const base = reviewCaptions.get(key) || buildItemCaption(item);
      await editAdminMessage(chatId, messageId, hasPhoto, `🗑 Удалён из ленты [${reasonLabel}]: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);

      // Уведомить продавца
      if (item.seller?.telegramUserId) {
        await notifyUser(
          item.seller.telegramUserId,
          buildDeclineNotification(item.title, flags),
        );
      }

      return bot.answerCallbackQuery(query.id, { text: 'Товар удалён 🗑' });
    }

    // ── 🚫 ib:{userId}:{itemId} — Забанить пользователя ─────────────────────
    if (data.startsWith('ib:')) {
      const parts = data.split(':');
      const userId = parseInt(parts[1]);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return bot.answerCallbackQuery(query.id, { text: 'Пользователь не найден', show_alert: true });
      }

      const { telegramUserId } = user;

      try {
        // Сохранить бан до удаления пользователя
        await prisma.bannedTelegramUser.upsert({
          where:  { telegramUserId },
          update: {},
          create: { telegramUserId },
        });
        // Каскадное удаление: товары, лайки, lookboards
        await prisma.user.delete({ where: { id: userId } });
      } catch (err) {
        console.error('[AdminBot] Ошибка бана:', err);
        return bot.answerCallbackQuery(query.id, { text: 'Ошибка при бане', show_alert: true });
      }

      const admin = getAdminName(query.from);
      const base = reviewCaptions.get(key) || msg.caption || msg.text || '';
      await editAdminMessage(chatId, messageId, hasPhoto, `🚫 Забанен: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);

      await notifyUser(telegramUserId, BAN_NOTIFICATION, null);

      return bot.answerCallbackQuery(query.id, { text: 'Пользователь заблокирован 🚫' });
    }
  });

  // Обработка ошибок polling
  bot.on('polling_error', (err) => {
    console.error('[AdminBot] Polling error:', err.message);
  });
}

// ── Публичный API ──────────────────────────────────────────────────────────────

/**
 * Запустить бота (вызывать один раз при старте сервера)
 */
function startBot() {
  if (!TelegramBot) {
    console.warn('[AdminBot] Пропуск запуска — node-telegram-bot-api не установлен');
    return;
  }
  if (!process.env.BOT_TOKEN) {
    console.warn('[AdminBot] BOT_TOKEN не задан — бот не запущен');
    return;
  }
  if (bot) return; // уже запущен

  bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
  registerHandlers();
  console.log('[AdminBot] Бот запущен (polling)');
}

/**
 * Отправить уведомление в admin-чат о новом товаре.
 * @param {number} itemId
 */
async function notifyAdminAboutNewItem(itemId) {
  console.log('[AdminBot] notifyAdminAboutNewItem вызвана для товара', itemId);

  if (!bot) {
    console.warn('[AdminBot] Бот не инициализирован, уведомление не отправлено');
    return;
  }

  const chatId = process.env.ADMIN_REVIEW_CHAT_ID;
  if (!chatId) {
    console.warn('[AdminBot] ADMIN_REVIEW_CHAT_ID не задан');
    return;
  }

  console.log('[AdminBot] Отправка уведомления в чат', chatId);

  let item;
  try {
    item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { seller: true },
    });
  } catch (err) {
    console.error('[AdminBot] Ошибка получения товара:', err);
    return;
  }

  if (!item) return;

  const caption  = buildItemCaption(item);
  const keyboard = buildKeyboard(item.id, item.sellerId, 0);

  let message = null;
  const firstImage = item.images?.[0];

  if (firstImage) {
    const raw = resolveUrl(firstImage);
    // Если локальный путь — склеиваем с MINI_APP_URL
    const photoUrl = raw.startsWith('http')
      ? raw
      : `${(process.env.MINI_APP_URL || 'https://jimparkby-gildamarket-cfc1.twc1.net').replace(/\/$/, '')}${raw}`;

    console.log('[AdminBot] Отправка фото:', photoUrl);

    try {
      message = await bot.sendPhoto(chatId, photoUrl, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error('[AdminBot] Ошибка отправки фото:', err.message);
      console.error('[AdminBot] URL фото:', photoUrl);
    }
  }

  if (!message) {
    try {
      message = await bot.sendMessage(chatId, caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error('[AdminBot] Не удалось отправить уведомление:', err.message);
      return;
    }
  }

  if (message) {
    reviewCaptions.set(msgKey(message.chat.id, message.message_id), caption);
    console.log('[AdminBot] Уведомление успешно отправлено, message_id:', message.message_id);
  } else {
    console.error('[AdminBot] Не удалось отправить уведомление');
  }
}

module.exports = { startBot, notifyAdminAboutNewItem };
