const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const authService = require('./services/auth.service');

(async () => {
  try {
    await connectDB();
    await authService.ensureDefaultAdmin();

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Smart Exam API running on port ${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  }
})();
