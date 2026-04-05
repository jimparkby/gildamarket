const { PrismaClient } = require('@prisma/client');
const resolveUrl = require('../utils/resolveUrl');

const prisma = new PrismaClient();

const INITIAL_PAGE_SIZE = 20;
const VIEW_MORE_SIZE = 10;
const PAGINATION_SIZE = 30;

function serializeItem(item, userId) {
  return {
    id: item.id,
    title: item.title,
    brand: item.brand,
    category: item.category,
    size: item.size,
    condition: item.condition,
    price: parseFloat(item.price),
    currency: item.currency,
    description: item.description,
    images: (item.images || []).map(resolveUrl),
    isSold: item.isSold,
    createdAt: item.createdAt,
    likesCount: item._count?.likes ?? item.likes?.length ?? 0,
    isLiked: userId ? item.likes?.some(l => l.userId === userId) : false,
    seller: item.seller ? {
      id: item.seller.id,
      firstName: item.seller.firstName,
      lastName: item.seller.lastName,
      telegramUsername: item.seller.telegramUsername,
      avatar: resolveUrl(item.seller.avatar),
    } : null,
  };
}

async function getItems(req, res, next) {
  try {
    const { search, page, mode } = req.query;
    const userId = req.userId;

    let skip = 0;
    let take = INITIAL_PAGE_SIZE;

    if (mode === 'more') {
      skip = INITIAL_PAGE_SIZE;
      take = VIEW_MORE_SIZE;
    } else if (page && parseInt(page) > 0) {
      const p = parseInt(page) - 1;
      skip = INITIAL_PAGE_SIZE + VIEW_MORE_SIZE + (p * PAGINATION_SIZE);
      take = PAGINATION_SIZE;
    }

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, telegramUsername: true, avatar: true },
          },
          likes: userId ? { where: { userId } } : false,
          _count: { select: { likes: true } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    res.json({
      items: items.map(i => serializeItem(i, userId)),
      total,
      hasMore: skip + take < total,
    });
  } catch (err) {
    next(err);
  }
}

async function getItem(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        seller: true,
        likes: userId ? { where: { userId } } : false,
        _count: { select: { likes: true } },
      },
    });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(serializeItem(item, userId));
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const { title, brand, category, size, condition, price, currency, description } = req.body;

    // S3: use file.location (full URL); local: use file.filename
    const images = (req.files || []).map(f => f.location || f.filename);

    if (!title || !category || !condition || !price) {
      return res.status(400).json({ error: 'title, category, condition, price are required' });
    }

    const item = await prisma.item.create({
      data: {
        title,
        brand: brand || null,
        category,
        size: size || null,
        condition,
        price: parseFloat(price),
        currency: currency || 'USD',
        description: description || null,
        images,
        sellerId: req.userId,
      },
      include: { seller: true, _count: { select: { likes: true } } },
    });

    res.status(201).json(serializeItem(item, req.userId));
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.sellerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.item.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function toggleLike(req, res, next) {
  try {
    const itemId = parseInt(req.params.id);
    const userId = req.userId;

    const existing = await prisma.itemLike.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existing) {
      await prisma.itemLike.delete({ where: { userId_itemId: { userId, itemId } } });
      res.json({ liked: false });
    } else {
      await prisma.itemLike.create({ data: { userId, itemId } });
      res.json({ liked: true });
    }
  } catch (err) {
    next(err);
  }
}

async function markSold(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.sellerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.item.update({
      where: { id },
      data: { isSold: !item.isSold },
    });

    res.json({ isSold: updated.isSold });
  } catch (err) {
    next(err);
  }
}

module.exports = { getItems, getItem, createItem, deleteItem, toggleLike, markSold };
