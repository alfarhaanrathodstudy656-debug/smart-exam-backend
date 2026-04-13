const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid Mongo ObjectId');

module.exports = {
  z,
  objectId
};
