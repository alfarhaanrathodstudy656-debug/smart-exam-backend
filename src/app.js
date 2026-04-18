const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const env = require('./config/env');
const routes = require('./routes');
const { swaggerUi, openApiSpec } = require('./config/swagger');
const { createSecurityLimiters } = require('./middleware/security.middleware');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

const { apiLimiter, authLimiter } = createSecurityLimiters({
  windowMinutes: env.rateLimitWindowMinutes,
  maxRequests: env.rateLimitMaxRequests,
  authMaxRequests: env.authRateLimitMaxRequests
});

const devOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.clientUrls.includes(origin)) {
      callback(null, true);
      return;
    }

    if (env.nodeEnv !== 'production' && devOriginPattern.test(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true
}));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Block query/operator injection and parameter pollution attempts.
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(hpp());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/openapi.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  explorer: true,
  customSiteTitle: 'Smart Exam API Docs'
}));

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', routes);

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Exam System Backend',
    docs: '/api/docs',
    health: '/api/health'
  });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
