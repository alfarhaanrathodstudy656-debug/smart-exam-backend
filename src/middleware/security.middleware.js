const rateLimit = require('express-rate-limit');

const createSecurityLimiters = ({
  windowMinutes = 15,
  maxRequests = 250,
  authMaxRequests = 20,
  adminAuthMaxRequests = 8
} = {}) => {
  const windowMs = Math.max(1, Number(windowMinutes || 15)) * 60 * 1000;
  const apiLimit = Math.max(10, Number(maxRequests || 250));
  const authLimit = Math.max(5, Number(authMaxRequests || 20));
  const adminAuthLimit = Math.max(3, Number(adminAuthMaxRequests || 8));

  const apiLimiter = rateLimit({
    windowMs,
    limit: apiLimit,
    standardHeaders: true,
    legacyHeaders: false,
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
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again later.'
    }
  });

  const adminAuthLimiter = rateLimit({
    windowMs,
    limit: adminAuthLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many admin authentication attempts. Please try again later.'
    }
  });

  return {
    apiLimiter,
    authLimiter,
    adminAuthLimiter
  };
};

module.exports = {
  createSecurityLimiters
};
