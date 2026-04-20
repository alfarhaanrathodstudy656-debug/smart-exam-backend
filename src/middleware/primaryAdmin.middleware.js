const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/appError');
const env = require('../config/env');

const primaryAdminOnly = (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED));
  }

  if ((req.user.email || '').toLowerCase() !== env.adminEmail.toLowerCase()) {
    return next(new AppError('Admin portal is restricted to the primary admin account.', StatusCodes.FORBIDDEN));
  }

  return next();
};

module.exports = primaryAdminOnly;

