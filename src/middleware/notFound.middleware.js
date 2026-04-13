const { StatusCodes } = require('http-status-codes');
const { errorResponse } = require('../utils/apiResponse');

const notFoundMiddleware = (req, res) => {
  errorResponse(res, {
    statusCode: StatusCodes.NOT_FOUND,
    message: `Route not found: ${req.originalUrl}`
  });
};

module.exports = notFoundMiddleware;
