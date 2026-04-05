const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ─── S3 Client (TimeWeb S3 / AWS-compatible) ─────────────────────────────────
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,           // e.g. https://s3.timeweb.cloud
  region: process.env.S3_REGION || 'ru-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,                         // required for non-AWS S3
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const maxSize = () => parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024;

// ─── S3 storage ──────────────────────────────────────────────────────────────
const s3Storage = multerS3({
  s3,
  bucket: process.env.S3_BUCKET,
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(14).toString('hex');
    cb(null, `gilda/${Date.now()}-${unique}${ext}`);
  },
});

// ─── Local fallback (dev without S3 credentials) ─────────────────────────────
const localDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, localDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

const useS3 = () =>
  process.env.S3_ENDPOINT &&
  process.env.S3_ACCESS_KEY &&
  process.env.S3_SECRET_KEY &&
  process.env.S3_BUCKET;

function createUpload() {
  return multer({
    storage: useS3() ? s3Storage : localStorage,
    fileFilter,
    limits: { fileSize: maxSize() },
  });
}

// Expose a lazy proxy so env is read at request time (after dotenv loads)
const upload = new Proxy({}, {
  get(_, prop) {
    return createUpload()[prop];
  },
});

module.exports = upload;
