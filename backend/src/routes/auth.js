const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { login } = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

router.post('/telegram', authLimiter, login);

module.exports = router;
