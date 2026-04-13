const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/appError');

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED));
  }

  if (!roles.includes(req.user.role)) {
    return next(new AppError('Access denied', StatusCodes.FORBIDDEN));
  }

  return next();
};

module.exports = authorize;
