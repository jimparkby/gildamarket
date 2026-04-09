const router = require('express').Router();
const upload = require('../middleware/upload');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/profileController');

router.get('/me', requireAuth, ctrl.getMe);
router.get('/search', optionalAuth, ctrl.searchUsers);
router.get('/:id/followers', optionalAuth, ctrl.getFollowers);
router.get('/:id/following', optionalAuth, ctrl.getFollowing);
router.get('/:id', optionalAuth, ctrl.getShop);
router.put('/me', requireAuth, ctrl.updateProfile);
router.post('/me/avatar', requireAuth, upload.single('avatar'), ctrl.uploadAvatar);
router.post('/me/background', requireAuth, upload.single('background'), ctrl.uploadBackground);

module.exports = router;
