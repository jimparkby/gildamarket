const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function serializeUser(user, isOwner = false) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    firstName: user.firstName,
    lastName: user.lastName,
    telegramUsername: user.telegramUsername,
    avatar: user.avatar ? `/uploads/${user.avatar}` : null,
    backgroundImage: user.backgroundImage ? `/uploads/${user.backgroundImage}` : null,
    about: user.about,
    createdAt: user.createdAt,
    itemsCount: user._count?.items ?? 0,
    shopLikesCount: user._count?.shopLikedBy ?? 0,
    isOwner,
  };
}

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { _count: { select: { items: true, shopLikedBy: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(serializeUser(user, true));
  } catch (err) {
    next(err);
  }
}

async function getShop(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const viewerId = req.userId;

    const [user, isLiked] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          _count: { select: { items: true, shopLikedBy: true } },
          items: {
            where: { isSold: false },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true, title: true, brand: true, price: true, currency: true,
              images: true, condition: true, isSold: true,
            },
          },
          lookBoards: { orderBy: { createdAt: 'desc' } },
        },
      }),
      viewerId
        ? prisma.shopLike.findUnique({ where: { userId_shopId: { userId: viewerId, shopId: id } } })
        : Promise.resolve(null),
    ]);

    if (!user) return res.status(404).json({ error: 'Shop not found' });

    res.json({
      ...serializeUser(user, viewerId === id),
      isShopLiked: !!isLiked,
      items: user.items.map(i => ({
        id: i.id, title: i.title, brand: i.brand,
        price: parseFloat(i.price), currency: i.currency,
        images: (i.images || []).map(f => `/uploads/${f}`),
        condition: i.condition, isSold: i.isSold,
      })),
      lookBoards: user.lookBoards.map(lb => ({
        id: lb.id, title: lb.title,
        images: (lb.images || []).map(f => `/uploads/${f}`),
        createdAt: lb.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { about, firstName, lastName } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        about: about !== undefined ? about : undefined,
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
      },
      include: { _count: { select: { items: true, shopLikedBy: true } } },
    });
    res.json(serializeUser(user, true));
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: req.file.filename },
    });
    res.json({ avatar: `/uploads/${user.avatar}` });
  } catch (err) {
    next(err);
  }
}

async function uploadBackground(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { backgroundImage: req.file.filename },
    });
    res.json({ backgroundImage: `/uploads/${user.backgroundImage}` });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, getShop, updateProfile, uploadAvatar, uploadBackground };
