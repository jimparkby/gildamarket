/**
 * Gilda Market — Telegram Bot
 */

let TelegramBot;
try {
  TelegramBot = require('node-telegram-bot-api');
} catch {
  console.warn('[Bot] node-telegram-bot-api не установлен — боты отключены.');
}

const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const resolveUrl = require('../utils/resolveUrl');
const { parseItemFromText } = require('./itemParser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

let primaryBot = null;

const reviewCaptions = new Map();

// ── Состояния пользователей для диалога добавления товара ─────────────────────
const userStates = new Map();   // telegramId → { step, chatId, timer }
const mediaGroups = new Map();  // media_group_id → { chatId, from, text, photos[], timer }
const rateLimiter = new Map();  // telegramId → { count, date }
const MAX_ITEMS_PER_DAY = 10;

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

// ── Proxy agent для обхода блокировок Telegram ───────────────────────────────
function createProxyAgent() {
  const proxyUrl = process.env.TELEGRAM_PROXY_URL;
  if (!proxyUrl) return null;
  try {
    if (/^socks/i.test(proxyUrl)) {
      const { SocksProxyAgent } = require('socks-proxy-agent');
      return new SocksProxyAgent(proxyUrl);
    }
    const { HttpsProxyAgent } = require('https-proxy-agent');
    return new HttpsProxyAgent(proxyUrl);
  } catch (err) {
    console.warn('[Bot] Прокси-агент не создан (установите пакет):', err.message);
    return null;
  }
}

function botOptions(extra = {}) {
  const agent = createProxyAgent();
  return agent ? { ...extra, request: { agent } } : extra;
}

// ── S3 ────────────────────────────────────────────────────────────────────────
function useS3() {
  return process.env.S3_ENDPOINT &&
         process.env.S3_ACCESS_KEY &&
         process.env.S3_SECRET_KEY &&
         process.env.S3_BUCKET;
}

async function uploadBufferToS3(buffer, fileName) {
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region:   process.env.S3_REGION || 'ru-1',
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
  const key = `gilda/${Date.now()}-${fileName}`;
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.S3_BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: 'image/jpeg',
    ACL:         'public-read',
  }));
  const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
  return `${endpoint}/${process.env.S3_BUCKET}/${key}`;
}

async function downloadFromS3(s3Url) {
  try {
    const endpoint = (process.env.S3_ENDPOINT || '').replace(/\/$/, '');
    const bucket   = process.env.S3_BUCKET || '';
    const prefix   = `${endpoint}/${bucket}/`;
    if (!s3Url.startsWith(prefix)) return null;
    const key = s3Url.slice(prefix.length);

    const s3 = new S3Client({
      endpoint,
      region:   process.env.S3_REGION || 'ru-1',
      credentials: {
        accessKeyId:     process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  } catch (err) {
    console.warn('[Bot] Ошибка скачивания из S3:', err.message);
    return null;
  }
}

async function fetchPhotoBuffer(imageValue) {
  const raw = resolveUrl(imageValue);
  if (!raw) return null;

  if (raw.startsWith('http') && useS3()) {
    return await downloadFromS3(raw);
  }

  const fileName = path.basename(raw);
  const filePath = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', fileName);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  return null;
}

// ── Caption и клавиатура для admin-сообщений ─────────────────────────────────
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
  if (item.condition)   lines.push(`⭐ Состояние: ${condition}`);
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
  if (!primaryBot) return;
  try {
    await primaryBot.sendMessage(telegramUserId, text, { parse_mode: parseMode || 'HTML' });
  } catch (err) {
    console.warn(`[Bot] Не удалось отправить сообщение пользователю ${telegramUserId}:`, err.message);
  }
}

async function editAdminMessage(botInstance, chatId, messageId, hasPhoto, text, keyboard) {
  try {
    const opts = {
      chat_id:    chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      ...(keyboard ? { reply_markup: keyboard } : {}),
    };
    if (hasPhoto) {
      await botInstance.editMessageCaption(text, opts);
    } else {
      await botInstance.editMessageText(text, opts);
    }
    return true;
  } catch (err) {
    console.warn('[Bot] Не удалось обновить сообщение:', err.message);
    return false;
  }
}

// ── Helpers для добавления товаров ────────────────────────────────────────────

function checkRateLimit(telegramId) {
  const today = new Date().toISOString().split('T')[0];
  const key = String(telegramId);
  const entry = rateLimiter.get(key);
  if (!entry || entry.date !== today) {
    rateLimiter.set(key, { count: 1, date: today });
    return true;
  }
  if (entry.count >= MAX_ITEMS_PER_DAY) return false;
  entry.count++;
  return true;
}

async function getUserOrCreate(from) {
  return prisma.user.upsert({
    where: { telegramUserId: String(from.id) },
    update: {},
    create: {
      telegramUserId: String(from.id),
      firstName: from.first_name || null,
      lastName: from.last_name || null,
      telegramUsername: from.username || null,
    },
  });
}

async function downloadTelegramPhoto(botInstance, fileId) {
  try {
    const fileLink = await botInstance.getFileLink(fileId);
    const res = await fetch(fileLink);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  } catch (err) {
    console.warn('[Bot] downloadTelegramPhoto error:', err.message);
    return null;
  }
}

async function sendAddItemMenu(botInstance, chatId) {
  const appUrl = process.env.MINI_APP_URL || '';
  await botInstance.sendMessage(
    chatId,
    'Как хочешь добавить товар?',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Через пересланный пост', callback_data: 'add_forward' }],
          [{ text: '📝 Добавить вручную', web_app: { url: appUrl } }],
          [{ text: '📦 Мои объявления', web_app: { url: `${appUrl}?page=profile` } }],
        ],
      },
    }
  );
}

async function processForwardedPost(botInstance, chatId, from, text, photoFileIds) {
  const telegramId = String(from.id);

  // Проверка бана
  const banned = await prisma.bannedTelegramUser.findUnique({ where: { telegramUserId: telegramId } });
  if (banned) {
    await botInstance.sendMessage(chatId, '⛔ Ваш аккаунт заблокирован.');
    return;
  }

  // Лимит публикаций
  if (!checkRateLimit(telegramId)) {
    await botInstance.sendMessage(chatId, `❌ Превышен дневной лимит публикаций (${MAX_ITEMS_PER_DAY} товаров в день).`);
    return;
  }

  // Сообщение-заглушка "Обработка..."
  let statusMsg;
  try {
    statusMsg = await botInstance.sendMessage(chatId, '⏳ Обработка...');
  } catch (err) {
    console.error('[Bot] processForwardedPost: не удалось отправить статус:', err.message);
    return;
  }

  const editStatus = (txt, extra) =>
    botInstance.editMessageText(txt, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML',
      ...(extra || {}),
    }).catch(() => {});

  try {
    // Парсинг текста
    const parsed = await parseItemFromText(text || '');

    if (parsed.isSold) {
      await editStatus('⚠️ Товар уже продан или в резерве — пропускаем.');
      return;
    }

    if (!parsed.title) {
      await editStatus(
        '❓ Не удалось определить название товара.\n\n' +
        'Попробуйте добавить вручную через приложение.',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '📝 Добавить вручную', web_app: { url: process.env.MINI_APP_URL || '' } },
            ]],
          },
        }
      );
      return;
    }

    // Поиск или создание пользователя
    const user = await getUserOrCreate(from);

    // Проверка дубликата
    const existing = await prisma.item.findFirst({
      where: {
        title: { equals: parsed.title, mode: 'insensitive' },
        sellerId: user.id,
        isSold: false,
        status: { not: 'rejected' },
      },
    });

    if (existing) {
      await editStatus(
        `ℹ️ Похожий товар уже есть в каталоге:\n\n<b>${esc(existing.title)}</b>\n\nЕсли хочешь обновить объявление — открой его через «Мои объявления».`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '📦 Мои объявления', web_app: { url: `${process.env.MINI_APP_URL || ''}?page=profile` } },
            ]],
          },
        }
      );
      return;
    }

    // Скачивание и загрузка фото
    const imageUrls = [];
    for (const fileId of photoFileIds.slice(0, 10)) {
      const buffer = await downloadTelegramPhoto(botInstance, fileId);
      if (!buffer) continue;

      const fileName = `tg-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      try {
        if (useS3()) {
          const url = await uploadBufferToS3(buffer, fileName);
          imageUrls.push(url);
        } else {
          const uploadsDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
          imageUrls.push(fileName);
        }
      } catch (err) {
        console.warn('[Bot] Ошибка загрузки фото:', err.message);
      }
    }

    // Создание товара
    const item = await prisma.item.create({
      data: {
        title:       parsed.title,
        brand:       parsed.brand || null,
        category:    parsed.category || 'other',
        size:        parsed.size || null,
        price:       parsed.price || 0,
        currency:    'RUB',
        description: parsed.description || null,
        images:      imageUrls,
        sellerId:    user.id,
      },
      include: { seller: true },
    });

    // Уведомление администратора (fire-and-forget)
    notifyAdminAboutNewItem(item.id).catch(err =>
      console.error('[Bot] notifyAdminAboutNewItem error:', err)
    );

    // Результат
    const priceStr = parsed.price
      ? `${parseFloat(item.price).toLocaleString('ru-RU')} ₽`
      : '—';
    const needsNote = parsed.needsClarification
      ? `\n\n⚠️ <b>Уточните цену</b> — откройте объявление в приложении.`
      : '';

    const resultText = [
      `✅ <b>Загрузка завершена</b>`,
      ``,
      `Добавлено: 1`,
      parsed.needsClarification ? `Нужно уточнить: 1` : `Нужно уточнить: 0`,
      `Пропущено: 0`,
      ``,
      `<b>Добавлено:</b>`,
      `• ${esc(item.title)} — ${priceStr}`,
      needsNote,
    ].join('\n');

    const appUrl = process.env.MINI_APP_URL || '';
    await editStatus(resultText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 Мои объявления', web_app: { url: `${appUrl}?page=profile` } }],
          [{ text: '➕ Добавить ещё', callback_data: 'add_forward' }],
        ],
      },
    });

  } catch (err) {
    console.error('[Bot] processForwardedPost error:', err);
    await editStatus('❌ Произошла ошибка при обработке. Попробуйте ещё раз.');
  }
}

// Обработчик одного сообщения из media group
function handleMediaGroupMessage(botInstance, msg) {
  const groupId = msg.media_group_id;
  const userId = String(msg.from?.id);

  if (!mediaGroups.has(groupId)) {
    mediaGroups.set(groupId, {
      chatId: msg.chat.id,
      from: msg.from,
      text: msg.caption || '',
      photos: [],
      timer: null,
      userId,
    });
  }

  const group = mediaGroups.get(groupId);
  if (msg.caption && !group.text) group.text = msg.caption;
  if (msg.photo) {
    group.photos.push(msg.photo[msg.photo.length - 1].file_id);
  }

  if (group.timer) clearTimeout(group.timer);
  group.timer = setTimeout(async () => {
    mediaGroups.delete(groupId);

    const state = userStates.get(userId);
    if (state?.timer) clearTimeout(state.timer);
    userStates.delete(userId);

    await processForwardedPost(botInstance, group.chatId, group.from, group.text, group.photos);
  }, 1500);
}

// ── Регистрация хендлеров ─────────────────────────────────────────────────────
function registerHandlers(botInstance, token) {
  // /approve_all — только из admin-чата
  botInstance.onText(/\/approve_all/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(process.env.ADMIN_REVIEW_CHAT_ID)) return;
    try {
      const result = await prisma.item.updateMany({
        where: { status: 'pending' },
        data:  { status: 'approved' },
      });
      await botInstance.sendMessage(chatId, `✅ Одобрено ${result.count} товаров со статусом pending.`);
    } catch (err) {
      console.error('[Bot] /approve_all error:', err);
      await botInstance.sendMessage(chatId, `❌ Ошибка: ${err.message}`);
    }
  });

  // /chatid — временная команда для получения ID чата
  botInstance.onText(/\/chatid/, async (msg) => {
    console.log('[Bot] /chatid от', msg.from.id, 'в чате', msg.chat.id);
    try {
      await botInstance.sendMessage(msg.chat.id,
        `Chat ID: <code>${msg.chat.id}</code>\nType: ${msg.chat.type}`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      console.error('[Bot] /chatid sendMessage error:', err.message);
    }
  });

  // /cancel — отмена текущего действия
  botInstance.onText(/\/cancel/, async (msg) => {
    const userId = String(msg.from?.id);
    const state = userStates.get(userId);
    if (state?.timer) clearTimeout(state.timer);
    userStates.delete(userId);
    try {
      await botInstance.sendMessage(msg.chat.id, 'Отменено ✖️');
    } catch (err) {
      console.error('[Bot] /cancel sendMessage error:', err.message);
    }
  });

  // /start
  botInstance.onText(/\/start/, async (msg) => {
    console.log('[Bot] /start от', msg.from.id);
    const chatId = msg.chat.id;
    const appUrl = process.env.MINI_APP_URL || 'https://jimparkby-gildamarket-cfc1.twc1.net';
    const text = [
      `Gilda — рессейл-платформа нового формата`,
      ``,
      `🔗 Создавай свой магазин`,
      `🔗 Находи уникальные вещи`,
      `🔗 Подписывайся на любимых продавцов`,
      ``,
      `Gilda. Твой магазин в Telegram.`,
    ].join('\n');
    try {
      await botInstance.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍 Открыть Gilda Market', web_app: { url: appUrl } }],
            [{ text: '➕ Добавить товар', callback_data: 'add_menu' }],
          ],
        },
      });
    } catch (err) {
      console.error('[Bot] /start sendMessage error:', err.message);
    }
  });

  // callback_query — кнопки admin-ревью и добавления товаров
  botInstance.on('callback_query', async (query) => {
    const data = query.data || '';
    const msg  = query.message;
    if (!msg) return;

    const chatId    = msg.chat.id;
    const messageId = msg.message_id;
    const hasPhoto  = !!(msg.photo && msg.photo.length);
    const key       = msgKey(chatId, messageId);

    // ── Меню добавления товара ─────────────────────────────────────────────────

    if (data === 'add_menu') {
      await botInstance.answerCallbackQuery(query.id);
      await sendAddItemMenu(botInstance, chatId);
      return;
    }

    if (data === 'add_forward') {
      const userId = String(query.from.id);
      const existing = userStates.get(userId);
      if (existing?.timer) clearTimeout(existing.timer);

      const timer = setTimeout(() => userStates.delete(userId), 5 * 60 * 1000);
      userStates.set(userId, { step: 'waiting_for_forward', chatId, timer });

      await botInstance.answerCallbackQuery(query.id);
      try {
        await botInstance.sendMessage(
          chatId,
          '📤 Перешлите пост с товаром или отправьте фото с описанием.\n\n' +
          'Можно прислать несколько фото сразу (альбом).\n\n' +
          'Чтобы отменить — /cancel'
        );
      } catch (err) {
        console.error('[Bot] add_forward sendMessage error:', err.message);
      }
      return;
    }

    // ── Admin-ревью ────────────────────────────────────────────────────────────

    if (data.startsWith('ia:')) {
      const itemId = parseInt(data.slice(3));
      const item = await prisma.item.findUnique({ where: { id: itemId }, include: { seller: true } });
      if (!item) {
        return botInstance.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }
      const admin = getAdminName(query.from);
      const base  = reviewCaptions.get(key) || buildItemCaption(item);
      await editAdminMessage(botInstance, chatId, messageId, hasPhoto, `✅ Оставлен: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);
      return botInstance.answerCallbackQuery(query.id, { text: 'Товар оставлен ✅' });
    }

    if (data.startsWith('io:')) {
      const parts  = data.split(':');
      const itemId = parseInt(parts[1]);
      const flags  = parseInt(parts[2]);
      const option = parseInt(parts[3]);

      if (!OPT_ORDER.includes(option)) {
        return botInstance.answerCallbackQuery(query.id, { text: 'Неизвестная опция', show_alert: true });
      }
      const item = await prisma.item.findUnique({ where: { id: itemId }, include: { seller: true } });
      if (!item) {
        return botInstance.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }

      const newFlags = flags ^ option;
      let base = reviewCaptions.get(key);
      if (!base) { base = buildItemCaption(item); reviewCaptions.set(key, base); }

      const statusLine = formatSelectedLine(newFlags);
      const keyboard   = buildKeyboard(itemId, item.sellerId, newFlags);
      const ok = await editAdminMessage(botInstance, chatId, messageId, hasPhoto, `${statusLine}\n\n${base}`, keyboard);
      if (!ok) return botInstance.answerCallbackQuery(query.id, { text: 'Не удалось обновить', show_alert: true });
      return botInstance.answerCallbackQuery(query.id, { text: 'Обновлено' });
    }

    if (data.startsWith('id:')) {
      const parts  = data.split(':');
      const itemId = parseInt(parts[1]);
      const flags  = parseInt(parts[2]);

      const item = await prisma.item.findUnique({ where: { id: itemId }, include: { seller: true } });
      if (!item) {
        return botInstance.answerCallbackQuery(query.id, { text: 'Товар не найден', show_alert: true });
      }
      try {
        await prisma.item.delete({ where: { id: itemId } });
      } catch (err) {
        console.error('[Bot] Ошибка удаления товара:', err);
        return botInstance.answerCallbackQuery(query.id, { text: 'Ошибка при удалении', show_alert: true });
      }

      const admin       = getAdminName(query.from);
      const selectedFlags = OPT_ORDER.filter(opt => flags & opt);
      const reasonLabel = selectedFlags.length
        ? selectedFlags.map(f => OPT_BUTTON_LABELS[f]).join(', ')
        : 'без причины';
      const base = reviewCaptions.get(key) || buildItemCaption(item);
      await editAdminMessage(botInstance, chatId, messageId, hasPhoto, `🗑 Удалён [${reasonLabel}]: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);

      if (item.seller?.telegramUserId) {
        await notifyUser(item.seller.telegramUserId, buildDeclineNotification(item.title, flags), 'HTML');
      }
      return botInstance.answerCallbackQuery(query.id, { text: 'Товар удалён 🗑' });
    }

    if (data.startsWith('ib:')) {
      const parts  = data.split(':');
      const userId = parseInt(parts[1]);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return botInstance.answerCallbackQuery(query.id, { text: 'Пользователь не найден', show_alert: true });
      }
      const telegramUserId = user.telegramUserId;
      try {
        await prisma.bannedTelegramUser.upsert({
          where:  { telegramUserId },
          update: {},
          create: { telegramUserId },
        });
        await prisma.user.delete({ where: { id: userId } });
      } catch (err) {
        console.error('[Bot] Ошибка бана:', err);
        return botInstance.answerCallbackQuery(query.id, { text: 'Ошибка при бане', show_alert: true });
      }

      const admin = getAdminName(query.from);
      const base  = reviewCaptions.get(key) || msg.caption || msg.text || '';
      await editAdminMessage(botInstance, chatId, messageId, hasPhoto, `🚫 Забанен: ${admin}\n\n${base}`, null);
      reviewCaptions.delete(key);

      await notifyUser(telegramUserId, BAN_NOTIFICATION, null);
      return botInstance.answerCallbackQuery(query.id, { text: 'Пользователь заблокирован 🚫' });
    }
  });

  // ── Обработка входящих сообщений пользователей ────────────────────────────
  botInstance.on('message', async (msg) => {
    // Пропускаем admin-чат
    if (String(msg.chat.id) === String(process.env.ADMIN_REVIEW_CHAT_ID)) return;
    // Пропускаем команды (обрабатываются через onText)
    if (msg.text && msg.text.startsWith('/')) return;
    // Пропускаем групповые и канальные сообщения
    if (msg.chat.type !== 'private') return;

    const userId = String(msg.from?.id);
    if (!userId) return;

    const state = userStates.get(userId);
    const inForwardState = state?.step === 'waiting_for_forward';

    // Пересланное сообщение — определяем по Telegram-метаданным
    const isForwarded = !!(
      msg.forward_from ||
      msg.forward_from_chat ||
      msg.forward_sender_name ||
      msg.forward_date
    );

    // Обрабатываем если: пользователь нажал "Через пересланный пост" ИЛИ сообщение пересланное
    if (!inForwardState && !isForwarded) return;

    // Media group (альбом фото)
    if (msg.media_group_id) {
      handleMediaGroupMessage(botInstance, msg);
      return;
    }

    // Одиночное сообщение (фото или текст)
    const text = msg.text || msg.caption || '';
    const photos = msg.photo ? [msg.photo[msg.photo.length - 1].file_id] : [];

    if (state?.timer) clearTimeout(state.timer);
    userStates.delete(userId);

    await processForwardedPost(botInstance, msg.chat.id, msg.from, text, photos);
  });
}

process.on('unhandledRejection', function(reason) {
  console.error('[Bot] Unhandled rejection:', reason && reason.message ? reason.message : reason);
});

// ── Запуск через Polling ──────────────────────────────────────────────────────
function startBot() {
  if (!TelegramBot) {
    console.warn('[Bot] Пропуск запуска — node-telegram-bot-api не установлен');
    return;
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.warn('[Bot] BOT_TOKEN не задан — бот не запущен');
    return;
  }

  function launch() {
    const tmp = new TelegramBot(token, botOptions({ polling: false }));
    tmp.deleteWebHook().catch(() => {}).finally(() => {
      const botInstance = new TelegramBot(token, botOptions({
        polling: {
          interval:  300,
          autoStart: true,
          params:    { timeout: 10 },
        },
      }));

      registerHandlers(botInstance, token);
      primaryBot = botInstance;
      console.log(`[Bot] Запущен (polling), токен: ${token.substring(0, 10)}...`);

      botInstance.on('polling_error', function(err) {
        if (err.code === 'ETELEGRAM' && err.message && err.message.includes('409')) {
          console.log(`[Bot] 409 Conflict — другой инстанс уже поллит, ждём 15 сек`);
          botInstance.stopPolling().then(function() {
            setTimeout(function() {
              botInstance.startPolling();
              console.log('[Bot] Polling перезапущен');
            }, 15000);
          });
        } else if (err.message && err.message.includes('ETIMEDOUT')) {
          // Временный обрыв соединения — бот сам переподключится, не засоряем логи
        } else {
          console.error('[Bot] Polling error:', err.message);
        }
      });
    });
  }
  launch();
}

// ── Заглушка для совместимости с index.js (router не нужен при polling) ───────
function createWebhookRouter() {
  const { Router } = require('express');
  const router = Router();
  router.post('/:index', function(req, res) { res.sendStatus(200); });
  return router;
}

// ── Уведомление admin-чата о новом товаре (через primaryBot) ─────────────────
async function notifyAdminAboutNewItem(itemId) {
  if (!primaryBot) return;

  const chatId = process.env.ADMIN_REVIEW_CHAT_ID;
  if (!chatId) return;

  let item;
  try {
    item = await prisma.item.findUnique({
      where:   { id: itemId },
      include: { seller: true },
    });
  } catch (err) {
    console.error('[Bot] Ошибка получения товара:', err);
    return;
  }
  if (!item) return;

  const fullCaption = buildItemCaption(item);
  const caption = fullCaption.length > 1024 ? fullCaption.slice(0, 1021) + '…' : fullCaption;
  const keyboard = buildKeyboard(item.id, item.sellerId, 0);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let message = null;
      const firstImage = item.images && item.images[0];

      if (firstImage) {
        const photoBuffer = await fetchPhotoBuffer(firstImage);
        if (photoBuffer) {
          try {
            message = await primaryBot.sendPhoto(chatId, photoBuffer, {
              caption:      caption,
              parse_mode:   'HTML',
              reply_markup: keyboard,
            });
          } catch (err) {
            console.warn(`[Bot] Попытка ${attempt}: ошибка отправки фото:`, err.message);
          }
        }
      }

      if (!message) {
        message = await primaryBot.sendMessage(chatId, caption, {
          parse_mode:   'HTML',
          reply_markup: keyboard,
        });
      }

      if (message) {
        reviewCaptions.set(msgKey(message.chat.id, message.message_id), caption);
        console.log(`[Bot] Admin уведомление отправлено (попытка ${attempt})`);
      }
      return;

    } catch (err) {
      console.error(`[Bot] Попытка ${attempt}/3 не удалась:`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 10000));
    }
  }
  console.error('[Bot] Не удалось отправить admin уведомление после 3 попыток');
}

module.exports = { startBot, notifyAdminAboutNewItem, createWebhookRouter };
