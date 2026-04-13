const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ actorId, role, action, entityType, entityId, metadata = {} }) => {
  try {
    await ActivityLog.create({
      actorId,
      role,
      action,
      entityType,
      entityId,
      metadata
    });
  } catch (_err) {
    // Non-blocking audit log.
  }
};

module.exports = {
  logActivity
};
