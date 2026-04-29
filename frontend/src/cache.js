const _cache = new Map();

export function getCache(key) {
  return _cache.has(key) ? _cache.get(key) : null;
}

export function setCache(key, value) {
  _cache.set(key, value);
}
