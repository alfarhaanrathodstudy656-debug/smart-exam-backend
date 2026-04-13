const { StatusCodes } = require('http-status-codes');
const { errorResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const errorMiddleware = (err, _req, res, _next) => {
  const isAppError = err instanceof AppError || err.isOperational;
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, {
    statusCode,
    message,
    errors: err.details || null,
    stack: process.env.NODE_ENV === 'development' && !isAppError ? err.stack : undefined
  });
};

module.exports = errorMiddleware;
