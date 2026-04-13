const successResponse = (res, {
  statusCode = 200,
  message = 'Success',
  data = null,
  meta = null
} = {}) => res.status(statusCode).json({
  success: true,
  message,
  data,
  ...(meta ? { meta } : {})
});

const errorResponse = (res, {
  statusCode = 500,
  message = 'Something went wrong',
  errors = null,
  stack = undefined
} = {}) => res.status(statusCode).json({
  success: false,
  message,
  ...(errors ? { errors } : {}),
  ...(stack ? { stack } : {})
});

module.exports = {
  successResponse,
  errorResponse
};
