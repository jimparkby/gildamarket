/**
 * Gilda Market — Item Parser
 * Извлекает данные о товаре из текста (Claude AI или regex fallback)
 */

const VALID_CATEGORIES = ['shoes', 'coats', 'tshirts', 'midlayer', 'pants', 'bags', 'accessories', 'other'];

const SOLD_REGEX = /\b(sold|продано|продан|продана|зарезервировано|reserved|резерв|забронировано|снят с продажи|снята с продажи|нет в наличии|не в наличии)\b/i;

async function parseItemFromText(text) {
  if (!text || !text.trim()) {
    return { title: null, brand: null, category: 'other', size: null, price: null, description: null, isSold: false, needsClarification: true, reason: 'no_text' };
  }

  if (SOLD_REGEX.test(text)) {
    return { title: null, brand: null, category: 'other', size: null, price: null, description: null, isSold: true, needsClarification: false, reason: null };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await parseWithClaude(text);
    } catch (err) {
      console.warn('[ItemParser] Claude недоступен, используем fallback:', err.message);
    }
  }

  return fallbackParse(text);
}

function cleanDescription(desc) {
  if (!desc) return null;
  const lines = desc.split('\n').filter(line => {
    const t = line.trim();
    if (!t) return false;
    if (/https?:\/\//i.test(t)) return false;
    if (/t\.me\//i.test(t)) return false;
    if (/\d[\d\s]*[₽р]|руб|\brub\b/i.test(t)) return false;
    if (/info\s*:/i.test(t)) return false;
    return true;
  });
  return lines.length ? lines.join('\n') : null;
}

async function parseWithClaude(text) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    throw new Error('@anthropic-ai/sdk не установлен');
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 8000, // 8 секунд — если api.anthropic.com недоступен, падаем в fallback
  });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Извлеки данные о товаре из этого поста и верни ТОЛЬКО JSON без markdown и пояснений:

Пост:
${text}

JSON:
{"title":"название товара","brand":"бренд или null","category":"одна из категорий","size":"размер или null","price":число_или_null,"description":"описание или null","isSold":false}

Категории: shoes=обувь, coats=верхняя одежда/куртки/пальто/шубы, tshirts=футболки/рубашки/блузы/топы, midlayer=свитера/джемперы/кардиганы/худи, pants=брюки/джинсы/шорты/юбки, bags=сумки/рюкзаки/клатчи, accessories=аксессуары/украшения/ремни/шарфы/шапки, other=всё остальное
price: только число в рублях, без символов, null если не указана
isSold: true если в тексте есть sold/продано/reserved/резерв/снято
description: только характеристики товара (состояние, материал, особенности), сохраняй переносы строк через \\n, НЕ включай цену, ссылки, контакты продавца`,
    }],
  });

  const raw = response.content[0].text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON не найден в ответе Claude');

  const parsed = JSON.parse(match[0]);

  if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = 'other';

  const result = {
    title: parsed.title || null,
    brand: parsed.brand || null,
    category: parsed.category || 'other',
    size: parsed.size || null,
    price: parsed.price ? parseFloat(parsed.price) : null,
    description: cleanDescription(parsed.description),
    isSold: !!parsed.isSold,
  };

  result.needsClarification = !result.title || !result.price;
  result.reason = !result.title ? 'no_title' : !result.price ? 'no_price' : null;

  return result;
}

function fallbackParse(text) {
  const priceMatch = text.match(/(\d[\d\s]{0,9})\s*(руб|₽|rub|р[.\s]|рублей)/i);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/\s+/g, '')) : null;

  const lines = text.trim().split('\n').filter(l => l.trim());
  const title = lines[0]?.replace(/[*_~`#]/g, '').trim().slice(0, 120) || null;

  return {
    title,
    brand: null,
    category: 'other',
    size: null,
    price,
    description: lines.length > 1 ? lines.slice(1).join('\n').trim().slice(0, 600) || null : null,
    isSold: false,
    needsClarification: !title || !price,
    reason: !title ? 'no_title' : !price ? 'no_price' : null,
  };
}

module.exports = { parseItemFromText };
