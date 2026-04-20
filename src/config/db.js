const mongoose = require('mongoose');
const env = require('./env');
const Submission = require('../models/Submission');

const dropLegacySubmissionUniqueIndex = async () => {
  try {
    await Submission.collection.dropIndex('userId_1_testId_1');
  } catch (error) {
    const ignorable =
      error?.codeName === 'IndexNotFound'
      || error?.codeName === 'NamespaceNotFound'
      || error?.code === 26
      || String(error?.message || '').toLowerCase().includes('ns not found');

    if (!ignorable) {
      throw error;
    }
  }
};

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production'
  });
  await dropLegacySubmissionUniqueIndex();
  return mongoose.connection;
};

module.exports = connectDB;
