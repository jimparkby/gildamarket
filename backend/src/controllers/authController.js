const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validateTelegramInitData } = require('../middleware/auth');

const prisma = new PrismaClient();

async function login(req, res, next) {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'initData required' });

    const tgUser = validateTelegramInitData(initData);
    if (!tgUser) return res.status(401).json({ error: 'Invalid Telegram data' });

    // Проверка бана
    const banned = await prisma.bannedTelegramUser.findUnique({
      where: { telegramUserId: String(tgUser.id) },
    });
    if (banned) return res.status(403).json({ error: 'Account banned' });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { telegramUserId: String(tgUser.id) },
      update: {
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        telegramUsername: tgUser.username || null,
      },
      create: {
        telegramUserId: String(tgUser.id),
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        telegramUsername: tgUser.username || null,
      },
    });

    const token = jwt.sign(
      { userId: user.id, telegramUserId: user.telegramUserId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
}

function serializeUser(user) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    firstName: user.firstName,
    lastName: user.lastName,
    telegramUsername: user.telegramUsername,
    avatar: user.avatar ? `/uploads/${user.avatar}` : null,
    backgroundImage: user.backgroundImage ? `/uploads/${user.backgroundImage}` : null,
    about: user.about,
  };
}

module.exports = { login };
