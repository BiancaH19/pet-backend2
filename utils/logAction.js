const Log = require('../models/log');

async function logAction(userId, action) {
  try {
    await Log.create({ userId, action });
    console.log(`Logged action: ${action} by user ${userId}`);
  } catch (err) {
    console.error('Error logging action:', err);
  }
}

module.exports = logAction;
