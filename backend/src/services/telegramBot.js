/**
 * Gilda Market — Telegram Admin Bot
 */
 
let TelegramBot;
try {
  TelegramBot = require('node-telegram-bot-api');
} catch {
  console.warn('[AdminBot] node-telegram-bot-api не установлен — бот отключён.');
}
 
const { PrismaClient } = require('@prisma/client');
const resolveUrl = require('../utils/resolveUrl');
const https = require('https');
const fs = require('fs');
const path = require('path');
 
const prisma = new PrismaClient();
 
let bot = null;
 
const reviewCaptions = new Map();
 
function msgKey(chatId, messageId) {
  return `${chatId}:${messageId}`;
}
 
const OPT_BAD_PHOTO  = 1;
const OPT_WRONG_INFO = 2;
const OPT_PROHIBITED = 4;
 
const OPT_ORDER = [OPT_BAD_PHOTO, OPT_WRONG_INFO, OPT_PROHIBITED];
 
const OPT_BUTTON_LABELS = {
  [OPT_BAD_PHOTO]:  'плохое фото',
  [OPT_WRONG_INFO]: 'неверное описание',
  [OPT_PROHIBITED]: 'запрещённый товар',
};
 
const OPT_USER_LINES = {
  [OPT_BAD_PHOTO]:
    '📷 <b>Фотографии товара</b> — снимки не показывают товар, слишком низкое качество или на фото посторонние предметы.',
  [OPT_WRONG_INFO]:
    '📝 <b>Описание или цена</b> — информация о товаре недостаточна, некорректна или не соответствует фото.',
  [OPT_PROHIBITED]:
    '🚫 <b>Запрещённый товар</b> — такие товары нельзя продавать на нашей площадке.',
};
 
const CONDITION_LABELS = {
  new:      '🌟 Новое с биркой',
  like_new: '✨ Как новое',
  good:     '👍 Хорошее',
  fair:     '👌 Удовлетворительное',
};
 
function esc(text) {
  if (!text) return '—';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
 
// ── Парсинг цены из текста ────────────────────────────────────────────────────
function parsePrice(text) {
  if (!text) return '';
  // Ищем числа рядом с валютой: 2500р, 2500руб, 2500₽, 2 500 руб, 2500 RUB
  const match = text.match(/(\d[\d\s]*\d|\d+)\s*(?:р(?:уб)?\.?|₽|rub)/i);
  if (match) {
    return match[1].replace(/\s/g, '');
  }
  // Просто первое большое число в тексте (>100)
  const nums = text.match(/\b(\d{3,6})\b/g);
  if (nums) return nums[0];
  return '';
}
 
// ── Скачать фото из Telegram и сохранить локально ────────────────────────────
async function downloadTelegramPhoto(fileId) {
  try {
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;
    const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const fileName = `draft_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      const req = https.get(fileUrl, (res) => {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        res.on('error', (err) => { file.close(); reject(err); });
      });
      // Таймаут 15 сек — если Telegram недоступен, не зависаем
      req.setTimeout(15000, () => { req.destroy(new Error('Download timeout')); });
      req.on('error', reject);
    });

    return `/uploads/${fileName}`;
  } catch (err) {
    console.error('[AdminBot] Ошибка скачивания фото:', err.message);
    return null;
  }
}
 
function buildItemCaption(item) {
  const seller = item.seller;
  const sellerHandle = seller?.telegramUsername
    ? `@${seller.telegramUsername}`
    : `id ${seller?.id ?? '—'}`;
  const sellerName = seller
    ? [seller.firstName, seller.lastName].filter(Boolean).join(' ') || '—'
    : '—';
 
  const condition = CONDITION_LABELS[item.condition] ?? esc(item.condition);
  const price = `${parseFloat(item.price).toLocaleString('ru-RU')} ${item.currency}`;
 
  const lines = [
    `🆕 <b>Новый товар — уже в ленте</b>`,
    ``,
    `🏷 <b>${esc(item.title)}</b> — ${price}`,
    `📦 Категория: ${esc(item.category)}`,
  ];
  if (item.brand)       lines.push(`👑 Бренд: ${esc(item.brand)}`);
  if (item.size)        lines.push(`📏 Размер: ${esc(item.size)}`);
  lines.push(`⭐ Состояние: ${condition}`);
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
        { text: '✅ Оставить товар', callback_data: `ia:${itemId}` },
        { text: '🗑 Удалить',        callback_data: `id:${itemId}:${flags}` },
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
 
async function notifyUser(telegramUserId, text, parseMode) {
  if (!bot) return;
  try {
    await bot.sendMessage(telegramUserId, text, { parse_mode: parseMode || 'HTML' });
  } catch (err) {
    console.warn(`[AdminBot] Не удалось отправить сообщение пользователю ${telegramUserId}:`, err.message);
  }
}
 
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
 
function registerHandlers() {
  // ── /approve_all ─────────────────────────────────────────────────────────────
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
 
  // ── /start ───────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
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
 
  // ── Обработка пересланных сообщений ──────────────────────────────────────────
  bot.on('message', async (msg) => {
    // Пропускаем команды и сообщения не из личных чатов
    if (msg.text && msg.text.startsWith('/')) return;
    if (msg.chat.type !== 'private') return;
    // Пропускаем если не переслано
    if (!msg.forward_date) return;
 
    const telegramUserId = String(msg.from.id);
    const chatId = msg.chat.id;
 
    try {
      // Найти пользователя в базе
      const user = await prisma.user.findUnique({ where: { telegramUserId } });
      if (!user) {
        await bot.sendMessage(chatId,
          '❌ Вы не зарегистрированы в Gilda Market. Откройте приложение сначала.',
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '🛍 Открыть Gilda Market', web_app: { url: process.env.MINI_APP_URL } },
              ]],
            },
          }
        );
        return;
      }
 
      // Собираем фото — берём все фото из сообщения
      const photos = [];
      if (msg.photo && msg.photo.length > 0) {
        // Берём фото наилучшего качества
        const bestPhoto = msg.photo[msg.photo.length - 1];
        const photoPath = await downloadTelegramPhoto(bestPhoto.file_id);
        if (photoPath) photos.push(photoPath);
      }
 
      // Если медиагруппа (несколько фото) — они придут отдельными сообщениями,
      // но мы хотя бы берём первое фото
 
      const text = msg.caption || msg.text || '';
      const price = parsePrice(text);
 
      // Удаляем старый черновик пользователя если есть
      await prisma.itemDraft.deleteMany({ where: { userId: user.id } });
 
      // Создаём новый черновик
      await prisma.itemDraft.create({
        data: {
          userId: user.id,
          title: '',
          description: text.trim(),
          price: price,
          images: photos,
        },
      });
 
      const appUrl = process.env.MINI_APP_URL || 'https://jimparkby-gildamarket-cfc1.twc1.net';
 
      await bot.sendMessage(chatId,
        `✅ <b>Пост получен!</b>\n\n` +
        `${photos.length > 0 ? `📸 Фото: ${photos.length} шт.\n` : '📸 Фото не найдено — добавите вручную\n'}` +
        `💰 Цена: ${price ? price + ' RUB' : 'не найдена — укажите вручную'}\n\n` +
        `Откройте приложение чтобы проверить и опубликовать товар:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '📦 Создать товар', web_app: { url: `${appUrl}/add` } },
            ]],
          },
        }
      );
 
    } catch (err) {
      console.error('[AdminBot] Ошибка обработки пересланного сообщения:', err);
      await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте ещё раз.');
    }
  });
 
  // ── callback_query ───────────────────────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const data = query.data || '';
    const msg = query.message;
    if (!msg) return;
 
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const hasPhoto = !!(msg.photo && msg.photo.length);
    const key = msgKey(chatId, messageId);
 
    if (data.startsWith('ia:')) {
      const itemId = parseInt(data.slice(3));
      const item = await prisma.item.findUnique({ where: { id: itemId }, include: { seller: true } });
      if (!item) {
        return bot.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }
      const admin = getAdminName(query.from);
      const base = reviewCaptions.get(key) || buildItemCaption(item);
      await editAdminMessage(chatId, messageId, hasPhoto, `✅ Оставлен: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);
      return bot.answerCallbackQuery(query.id, { text: 'Товар оставлен ✅' });
    }
 
    if (data.startsWith('io:')) {
      const parts = data.split(':');
      const itemId = parseInt(parts[1]);
      const flags  = parseInt(parts[2]);
      const option = parseInt(parts[3]);
 
      if (!OPT_ORDER.includes(option)) {
        return bot.answerCallbackQuery(query.id, { text: 'Неизвестная опция', show_alert: true });
      }
 
      const item = await prisma.item.findUnique({ where: { id: itemId }, include: { seller: true } });
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
 
    if (data.startsWith('id:')) {
      const parts = data.split(':');
      const itemId = parseInt(parts[1]);
      const flags  = parseInt(parts[2]);
 
      const item = await prisma.item.findUnique({ where: { id: itemId }, include: { seller: true } });
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
        ? selectedFlags.map(function(f) { return OPT_BUTTON_LABELS[f]; }).join(', ')
        : 'без причины';
      const base = reviewCaptions.get(key) || buildItemCaption(item);
      await editAdminMessage(chatId, messageId, hasPhoto, `🗑 Удалён [${reasonLabel}]: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);
 
      if (item.seller && item.seller.telegramUserId) {
        await notifyUser(item.seller.telegramUserId, buildDeclineNotification(item.title, flags), 'HTML');
      }
 
      return bot.answerCallbackQuery(query.id, { text: 'Товар удалён 🗑' });
    }
 
    if (data.startsWith('ib:')) {
      const parts = data.split(':');
      const userId = parseInt(parts[1]);
 
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return bot.answerCallbackQuery(query.id, { text: 'Пользователь не найден', show_alert: true });
      }
 
      const telegramUserId = user.telegramUserId;
 
      try {
        await prisma.bannedTelegramUser.upsert({
          where:  { telegramUserId: telegramUserId },
          update: {},
          create: { telegramUserId: telegramUserId },
        });
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
 
  bot.on('polling_error', function(err) {
    if (err.message && err.message.includes('409 Conflict')) {
      console.warn('[AdminBot] 409 Conflict — другой экземпляр уже запущен, останавливаем polling');
      bot.stopPolling();
      return;
    }
    console.error('[AdminBot] Polling error (ignored):', err.message);
  });
}
 
process.on('unhandledRejection', function(reason) {
  console.error('[AdminBot] Unhandled rejection:', reason && reason.message ? reason.message : reason);
});
 
function startBot() {
  if (!TelegramBot) {
    console.warn('[AdminBot] Пропуск запуска — node-telegram-bot-api не установлен');
    return;
  }
  if (!process.env.BOT_TOKEN) {
    console.warn('[AdminBot] BOT_TOKEN не задан — бот не запущен');
    return;
  }
  if (bot) return;
 
  bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
  registerHandlers();
  console.log('[AdminBot] Бот запущен (polling)');
}
 
async function notifyAdminAboutNewItem(itemId) {
  if (!bot) return;
 
  const chatId = process.env.ADMIN_REVIEW_CHAT_ID;
  if (!chatId) return;
 
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
  const firstImage = item.images && item.images[0];
 
  if (firstImage) {
    const raw = resolveUrl(firstImage);

    // Пробуем читать файл с диска (и для /uploads/... и для старых полных URL).
    // Это надёжнее, чем давать Telegram HTTP-ссылку на наш сервер.
    let photoSource;
    const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    const fileName = path.basename(raw); // работает и для /uploads/name.jpg, и для https://.../name.jpg
    if (fileName) {
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        photoSource = fs.createReadStream(filePath);
      }
    }
    // Фallback — S3 или внешний URL (для таких Telegram может скачать сам)
    if (!photoSource && raw.startsWith('http')) {
      photoSource = raw;
    }

    try {
      message = await bot.sendPhoto(chatId, photoSource, {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error('[AdminBot] Ошибка отправки фото:', err.message);
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
  }
}
 
module.exports = { startBot: startBot, notifyAdminAboutNewItem: notifyAdminAboutNewItem };
 