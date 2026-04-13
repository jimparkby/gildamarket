const router = require('express').Router();
const upload = require('../middleware/upload');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/itemsController');
const { PrismaClient } = require('@prisma/client');
 
const prisma = new PrismaClient();
 
// ── Draft routes (должны быть ДО /:id) ───────────────────────────────────────
 
// GET /api/items/draft — получить черновик текущего пользователя
router.get('/draft', requireAuth, async (req, res, next) => {
  try {
    const draft = await prisma.itemDraft.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ draft: draft || null });
  } catch (err) {
    next(err);
  }
});
 
// DELETE /api/items/draft — удалить черновик после публикации
router.delete('/draft', requireAuth, async (req, res, next) => {
  try {
    await prisma.itemDraft.deleteMany({ where: { userId: req.userId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
 
// ── Item routes ───────────────────────────────────────────────────────────────
router.get('/', optionalAuth, ctrl.getItems);
router.get('/:id', optionalAuth, ctrl.getItem);
router.post('/', requireAuth, upload.array('images', 10), ctrl.createItem);
router.put('/:id', requireAuth, upload.array('images', 10), ctrl.updateItem);
router.delete('/:id', requireAuth, ctrl.deleteItem);
router.post('/:id/like', requireAuth, ctrl.toggleLike);
router.patch('/:id/sold', requireAuth, ctrl.markSold);
 
module.exports = router;
 