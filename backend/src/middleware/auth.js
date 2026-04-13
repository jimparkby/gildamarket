const crypto = require('crypto');
const jwt = require('jsonwebtoken');
 
/**
 * Validate Telegram Web App initData using HMAC-SHA256
 * Supports multiple bots via BOT_TOKEN and BOT_TOKEN_2
 */
function validateTelegramInitData(initData) {
  const tokens = [process.env.BOT_TOKEN, process.env.BOT_TOKEN_2].filter(Boolean);
  if (tokens.length === 0) throw new Error('BOT_TOKEN not set');
 
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return null;
 
  urlParams.delete('hash');
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
 
  for (const botToken of tokens) {
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
 
    if (computedHash === hash) {
      const userStr = urlParams.get('user');
      if (!userStr) return null;
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
 
  return null;
}
 
/**
 * Middleware: verify JWT token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.telegramUserId = payload.telegramUserId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
 
/**
 * Optional auth – attaches userId if token present, doesn't block
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      req.userId = payload.userId;
    } catch {}
  }
  next();
}
 
module.exports = { validateTelegramInitData, requireAuth, optionalAuth };
 