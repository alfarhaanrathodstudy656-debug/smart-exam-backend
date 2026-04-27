const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const authService = require('./services/auth.service');
const mongoose = require('mongoose');

let server;
let isShuttingDown = false;

const shutdown = (reason = 'shutdown', exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  // eslint-disable-next-line no-console
  console.log(`Stopping server (${reason})...`);

  const forceCloseTimer = setTimeout(() => {
    process.exit(exitCode);
  }, 10000);
  forceCloseTimer.unref();

  const closeMongo = async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error while closing Mongo connection', error);
    }
  };

  if (!server) {
    closeMongo().finally(() => process.exit(exitCode));
    return;
  }

  server.close(() => {
    closeMongo().finally(() => process.exit(exitCode));
  });
};

const handleServerError = (error) => {
  if (error?.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`Port ${env.port} is already in use. Stop the existing process or set a different PORT.`);
    shutdown('port_in_use', 1);
    return;
  }

  // eslint-disable-next-line no-console
  console.error('Server failed to start', error);
  shutdown('server_error', 1);
};

(async () => {
  try {
    await connectDB();
    await authService.ensureDefaultAdmin();

    server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Smart Exam API running on port ${env.port}`);
    });
    server.on('error', handleServerError);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    shutdown('startup_failure', 1);
  }
})();

process.on('SIGINT', () => shutdown('sigint', 0));
process.on('SIGTERM', () => shutdown('sigterm', 0));
process.on('unhandledRejection', (error) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection', error);
  shutdown('unhandled_rejection', 1);
});
process.on('uncaughtException', (error) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception', error);
  shutdown('uncaught_exception', 1);
});
