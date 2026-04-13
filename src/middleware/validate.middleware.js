const { ZodError } = require('zod');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/appError');

const validate = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    req.body = parsed.body;
    req.params = parsed.params;
    req.query = parsed.query;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('Validation failed', StatusCodes.BAD_REQUEST, error.flatten()));
    }

    return next(error);
  }
};

module.exports = validate;
