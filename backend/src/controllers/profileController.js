const { PrismaClient } = require('@prisma/client');
const resolveUrl = require('../utils/resolveUrl');

const prisma = new PrismaClient();

function serializeUser(user, isOwner = false) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    firstName: user.firstName,
    lastName: user.lastName,
    telegramUsername: user.telegramUsername,
    avatar: resolveUrl(user.avatar),
    backgroundImage: resolveUrl(user.backgroundImage),
    about: user.about,
    createdAt: user.createdAt,
    itemsCount: user._count?.items ?? 0,
    shopLikesCount: user._count?.shopLikedBy ?? 0,
    followingCount: user._count?.likedShops ?? 0,
    isOwner,
  };
}

function serializeItem(i, seller = null) {
  return {
    id: i.id, title: i.title, brand: i.brand,
    price: parseFloat(i.price), currency: i.currency,
    images: (i.images || []).map(resolveUrl),
    condition: i.condition, isSold: i.isSold, status: i.status,
    category: i.category, subcategory: i.subcategory || null,
    size: i.size || null, description: i.description || null,
    seller,
  };
}

async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { telegramUsername: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      include: { _count: { select: { items: true, shopLikedBy: true, likedShops: true } } },
    });
    res.json(users.map(u => serializeUser(u, false)));
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { _count: { select: { items: true, shopLikedBy: true, likedShops: true } } },
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
          _count: { select: { items: true, shopLikedBy: true, likedShops: true } },
          items: {
            where: {
              ...(viewerId === id ? {} : { status: 'approved' }),
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true, title: true, brand: true, category: true, price: true, currency: true,
              images: true, condition: true, isSold: true, status: true,
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

    const activeItems = user.items.filter(i => !i.isSold);
    const archivedItems = user.items.filter(i => i.isSold);

    const sellerInfo = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      telegramUsername: user.telegramUsername,
      avatar: resolveUrl(user.avatar),
    };

    res.json({
      ...serializeUser(user, viewerId === id),
      isShopLiked: !!isLiked,
      items: activeItems.map(i => serializeItem(i, sellerInfo)),
      archivedItems: archivedItems.map(i => serializeItem(i, sellerInfo)),
      lookBoards: user.lookBoards.map(lb => ({
        id: lb.id, title: lb.title, description: lb.description,
        images: (lb.images || []).map(resolveUrl),
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
      include: { _count: { select: { items: true, shopLikedBy: true, likedShops: true } } },
    });
    res.json(serializeUser(user, true));
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatar = req.file.location || req.file.filename;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatar },
    });
    res.json({ avatar: resolveUrl(user.avatar) });
  } catch (err) {
    next(err);
  }
}

async function uploadBackground(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const backgroundImage = req.file.location || req.file.filename;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { backgroundImage },
    });
    res.json({ backgroundImage: resolveUrl(user.backgroundImage) });
  } catch (err) {
    next(err);
  }
}

async function getFollowers(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const likes = await prisma.shopLike.findMany({
      where: { shopId: id },
      include: {
        user: {
          include: { _count: { select: { items: true, shopLikedBy: true, likedShops: true } } },
        },
      },
      orderBy: { userId: 'desc' },
    });
    res.json(likes.map(l => serializeUser(l.user)));
  } catch (err) {
    next(err);
  }
}

async function getFollowing(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const likes = await prisma.shopLike.findMany({
      where: { userId: id },
      include: {
        shop: {
          include: { _count: { select: { items: true, shopLikedBy: true, likedShops: true } } },
        },
      },
      orderBy: { shopId: 'desc' },
    });
    res.json(likes.map(l => serializeUser(l.shop)));
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, getShop, updateProfile, uploadAvatar, uploadBackground, searchUsers, getFollowers, getFollowing };
