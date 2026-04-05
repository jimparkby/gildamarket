const router = require('express').Router();
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/lookboardController');

router.get('/me', requireAuth, ctrl.getMyLookBoards);
router.post('/', requireAuth, upload.array('images', 20), ctrl.createLookBoard);
router.delete('/:id', requireAuth, ctrl.deleteLookBoard);

module.exports = router;
