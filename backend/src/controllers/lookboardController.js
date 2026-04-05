const { PrismaClient } = require('@prisma/client');
const resolveUrl = require('../utils/resolveUrl');

const prisma = new PrismaClient();

async function getMyLookBoards(req, res, next) {
  try {
    const lookBoards = await prisma.lookBoard.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(lookBoards.map(lb => ({
      id: lb.id,
      title: lb.title,
      images: (lb.images || []).map(resolveUrl),
      createdAt: lb.createdAt,
    })));
  } catch (err) {
    next(err);
  }
}

async function createLookBoard(req, res, next) {
  try {
    const { title } = req.body;
    // S3: file.location; local: file.filename
    const images = (req.files || []).map(f => f.location || f.filename);

    if (!images.length) return res.status(400).json({ error: 'At least one image required' });

    const lb = await prisma.lookBoard.create({
      data: { title: title || null, images, userId: req.userId },
    });

    res.status(201).json({
      id: lb.id,
      title: lb.title,
      images: lb.images.map(resolveUrl),
      createdAt: lb.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteLookBoard(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const lb = await prisma.lookBoard.findUnique({ where: { id } });
    if (!lb) return res.status(404).json({ error: 'Not found' });
    if (lb.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    await prisma.lookBoard.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyLookBoards, createLookBoard, deleteLookBoard };
