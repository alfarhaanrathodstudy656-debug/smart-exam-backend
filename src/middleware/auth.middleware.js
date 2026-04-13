const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { verifyToken } = require('../utils/jwt');

const authMiddleware = async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED));
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('+password');

    if (!user) {
      return next(new AppError('Invalid token user', StatusCodes.UNAUTHORIZED));
    }

    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    };

    return next();
  } catch (_error) {
    return next(new AppError('Invalid or expired token', StatusCodes.UNAUTHORIZED));
  }
};

module.exports = authMiddleware;
