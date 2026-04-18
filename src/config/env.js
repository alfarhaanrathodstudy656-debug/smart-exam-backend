const dotenv = require('dotenv');

dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];
required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: process.env.ADMIN_EMAIL || 'alfarhaanrathodstudy656@gmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  defaultNegativeMarkRatio: Number(process.env.DEFAULT_NEGATIVE_MARK_RATIO || 0.25),
  clientUrls: (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'https://smart-exam-system-umber.vercel.app')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleAdminAllowlist: (process.env.GOOGLE_ADMIN_ALLOWLIST || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
  passwordResetOtpExpiryMinutes: Number(process.env.PASSWORD_RESET_OTP_EXPIRY_MINUTES || 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
  rateLimitWindowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 250),
  authRateLimitMaxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 20),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'Smart Exam <no-reply@smart-exam.local>'
  }
};

env.clientUrl = env.clientUrls[0] || 'https://smart-exam-system-umber.vercel.app';

module.exports = env;


