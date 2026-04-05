const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/favoritesController');

router.get('/', requireAuth, ctrl.getFavorites);
router.post('/shop/:shopId', requireAuth, ctrl.toggleShopLike);

module.exports = router;
