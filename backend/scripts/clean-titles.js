/**
 * One-time script: removes URLs from item titles in the database.
 * Run on the server: node scripts/clean-titles.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function cleanTitle(title) {
  if (!title) return null;
  const cleaned = title
    .replace(/\s*\(https?:\/\/[^\s)]+\)/g, '')
    .replace(/\s*\[https?:\/\/[^\s\]]+\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
  return cleaned || null;
}

async function main() {
  const items = await prisma.item.findMany({
    where: { title: { contains: 'http' } },
    select: { id: true, title: true },
  });

  if (items.length === 0) {
    console.log('Нет товаров с URL в названии — всё чисто.');
    return;
  }

  console.log(`Найдено ${items.length} товаров с URL в названии:\n`);

  let updated = 0;
  for (const item of items) {
    const newTitle = cleanTitle(item.title);
    console.log(`ID ${item.id}:`);
    console.log(`  Было:  ${item.title}`);
    console.log(`  Стало: ${newTitle}`);

    if (newTitle && newTitle !== item.title) {
      await prisma.item.update({
        where: { id: item.id },
        data: { title: newTitle },
      });
      updated++;
    }
  }

  console.log(`\nОбновлено: ${updated} из ${items.length} товаров.`);
}

main()
  .catch(err => { console.error('Ошибка:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
