const router = require('express').Router();
const { login } = require('../controllers/authController');

router.post('/telegram', login);

module.exports = router;
