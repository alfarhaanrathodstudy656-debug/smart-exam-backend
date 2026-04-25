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

  const connectWithUri = async (uri) =>
    mongoose.connect(uri, {
      autoIndex: env.nodeEnv !== 'production'
    });

  try {
    await connectWithUri(env.mongoUri);
  } catch (error) {
    const isSrvLookupError = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEOUT'].includes(error?.code);
    if (!isSrvLookupError || !env.mongoUriFallback) {
      throw error;
    }

    // eslint-disable-next-line no-console
    console.warn('Primary Mongo SRV lookup failed. Retrying with fallback URI.');
    await connectWithUri(env.mongoUriFallback);
  }

  await dropLegacySubmissionUniqueIndex();
  return mongoose.connection;
};

module.exports = connectDB;
