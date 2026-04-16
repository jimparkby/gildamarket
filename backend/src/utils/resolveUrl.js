/**
 * Resolves a stored file value to a public URL.
 * - If already a full URL (S3): return as-is
 * - If just a filename (legacy local): prefix with /uploads/
 */
function resolveUrl(val) {
  if (!val) return null;
  if (val.startsWith('http')) return val;
  if (val.startsWith('/')) return val;
  return `/uploads/${val}`;
}

module.exports = resolveUrl;
