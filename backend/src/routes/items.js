const router = require('express').Router();
const upload = require('../middleware/upload');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/itemsController');

router.get('/', optionalAuth, ctrl.getItems);
router.get('/:id', optionalAuth, ctrl.getItem);
router.post('/', requireAuth, upload.array('images', 10), ctrl.createItem);
router.put('/:id', requireAuth, upload.array('images', 10), ctrl.updateItem);
router.delete('/:id', requireAuth, ctrl.deleteItem);
router.post('/:id/like', requireAuth, ctrl.toggleLike);
router.patch('/:id/sold', requireAuth, ctrl.markSold);

module.exports = router;
