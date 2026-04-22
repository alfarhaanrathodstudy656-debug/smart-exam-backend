const rateLimit = require('express-rate-limit');

const createSecurityLimiters = ({
  windowMinutes = 15,
  maxRequests = 250,
  authMaxRequests = 20,
  userAuthMaxRequests = 12,
  adminAuthMaxRequests = 8
} = {}) => {
  const windowMs = Math.max(1, Number(windowMinutes || 15)) * 60 * 1000;
  const apiLimit = Math.max(10, Number(maxRequests || 250));
  const authLimit = Math.max(5, Number(authMaxRequests || 20));
  const userAuthLimit = Math.max(5, Number(userAuthMaxRequests || 12));
  const adminAuthLimit = Math.max(3, Number(adminAuthMaxRequests || 8));

  const authKeyGenerator = (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const routeScope = req.path || 'auth';
    return `${req.ip}:${routeScope}:${email || 'anonymous'}`;
  };

  const apiLimiter = rateLimit({
    windowMs,
    limit: apiLimit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => String(req.path || '').startsWith('/auth'),
    message: {
      success: false,
      message: 'Too many requests. Please try again later.'
    }
  });

  const authLimiter = rateLimit({
    windowMs,
    limit: authLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authKeyGenerator,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again later.'
    }
  });

  const userAuthLimiter = rateLimit({
    windowMs,
    limit: userAuthLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authKeyGenerator,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: 'Too many user authentication attempts. Please wait and retry.'
    }
  });

  const adminAuthLimiter = rateLimit({
    windowMs,
    limit: adminAuthLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authKeyGenerator,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: 'Too many admin authentication attempts. Please try again later.'
    }
  });

  return {
    apiLimiter,
    authLimiter,
    userAuthLimiter,
    adminAuthLimiter
  };
};

module.exports = {
  createSecurityLimiters
};
