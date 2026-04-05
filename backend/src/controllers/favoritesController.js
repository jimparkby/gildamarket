const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFavorites(req, res, next) {
  try {
    const userId = req.userId;

    const [likedItems, likedShops] = await Promise.all([
      prisma.itemLike.findMany({
        where: { userId },
        include: {
          item: {
            include: {
              seller: {
                select: { id: true, firstName: true, lastName: true, telegramUsername: true, avatar: true },
              },
              _count: { select: { likes: true } },
            },
          },
        },
        orderBy: { item: { createdAt: 'desc' } },
      }),
      prisma.shopLike.findMany({
        where: { userId },
        include: {
          shop: {
            include: {
              _count: { select: { items: true, shopLikedBy: true } },
            },
          },
        },
      }),
    ]);

    const items = likedItems.map(({ item: i }) => ({
      id: i.id,
      title: i.title,
      brand: i.brand,
      price: parseFloat(i.price),
      currency: i.currency,
      condition: i.condition,
      images: (i.images || []).map(f => `/uploads/${f}`),
      isSold: i.isSold,
      isLiked: true,
      likesCount: i._count.likes,
      seller: {
        id: i.seller.id,
        firstName: i.seller.firstName,
        lastName: i.seller.lastName,
        telegramUsername: i.seller.telegramUsername,
        avatar: i.seller.avatar ? `/uploads/${i.seller.avatar}` : null,
      },
    }));

    const shops = likedShops.map(({ shop: s }) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      telegramUsername: s.telegramUsername,
      avatar: s.avatar ? `/uploads/${s.avatar}` : null,
      backgroundImage: s.backgroundImage ? `/uploads/${s.backgroundImage}` : null,
      about: s.about,
      itemsCount: s._count.items,
      shopLikesCount: s._count.shopLikedBy,
      isShopLiked: true,
    }));

    res.json({ items, shops });
  } catch (err) {
    next(err);
  }
}

async function toggleShopLike(req, res, next) {
  try {
    const userId = req.userId;
    const shopId = parseInt(req.params.shopId);

    if (userId === shopId) return res.status(400).json({ error: 'Cannot like own shop' });

    const existing = await prisma.shopLike.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });

    if (existing) {
      await prisma.shopLike.delete({ where: { userId_shopId: { userId, shopId } } });
      res.json({ liked: false });
    } else {
      await prisma.shopLike.create({ data: { userId, shopId } });
      res.json({ liked: true });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { getFavorites, toggleShopLike };
