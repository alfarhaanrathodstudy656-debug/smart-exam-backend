const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AppError = require('../utils/appError');
const { StatusCodes } = require('http-status-codes');

const uploadDir = path.join(process.cwd(), 'uploads', 'viva');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_AUDIO_MIME = new Set([
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || '.webm').toLowerCase();
    cb(null, `viva-${unique}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  if (!ALLOWED_AUDIO_MIME.has(mime)) {
    cb(new AppError('Unsupported audio format. Allowed: webm, wav, mp3, ogg, m4a.', StatusCodes.BAD_REQUEST));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter
});

module.exports = upload;
