const { PrismaClient } = require('@prisma/client');
const resolveUrl = require('../utils/resolveUrl');

const prisma = new PrismaClient();

function serializeLb(lb) {
  return {
    id: lb.id,
    title: lb.title,
    description: lb.description,
    images: (lb.images || []).map(resolveUrl),
    createdAt: lb.createdAt,
    user: lb.user ? {
      id: lb.user.id,
      firstName: lb.user.firstName,
      lastName: lb.user.lastName,
      telegramUsername: lb.user.telegramUsername,
      avatar: resolveUrl(lb.user.avatar),
    } : undefined,
  };
}

async function getMyLookBoards(req, res, next) {
  try {
    const lookBoards = await prisma.lookBoard.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(lookBoards.map(serializeLb));
  } catch (err) {
    next(err);
  }
}

async function getLookBoardFeed(req, res, next) {
  try {
    const lookBoards = await prisma.lookBoard.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, telegramUsername: true, avatar: true },
        },
      },
    });
    res.json(lookBoards.map(serializeLb));
  } catch (err) {
    next(err);
  }
}

async function createLookBoard(req, res, next) {
  try {
    const { title, description } = req.body;
    const images = (req.files || []).map(f => f.location || f.filename);

    if (!images.length) return res.status(400).json({ error: 'At least one image required' });

    const lb = await prisma.lookBoard.create({
      data: { title: title || null, description: description || null, images, userId: req.userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, telegramUsername: true, avatar: true },
        },
      },
    });

    res.status(201).json(serializeLb(lb));
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

module.exports = { getMyLookBoards, getLookBoardFeed, createLookBoard, deleteLookBoard };
