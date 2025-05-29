const { Op } = require('sequelize');
const Log = require('./models/log');
const MonitoredUser = require('./models/monitoredUser');

async function detectSuspiciousUsers() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000); // 1 minut în urmă

  const logs = await Log.findAll({
    where: {
      timestamp: { [Op.gte]: oneMinuteAgo }
    }
  });

  const activityCount = {};
  logs.forEach(log => {
    const userId = log.userId;
    activityCount[userId] = (activityCount[userId] || 0) + 1;
  });

  for (const [userId, count] of Object.entries(activityCount)) {
    if (count >= 5) {
      const alreadyMonitored = await MonitoredUser.findOne({ where: { userId } });
      if (!alreadyMonitored) {
        await MonitoredUser.create({
          userId,
          reason: `Performed ${count} CRUD operations in the last 60 seconds`
        });
        console.log(`User ${userId} added to MonitoredUsers for suspicious activity`);
      }
    }
  }
}

function startMonitoring() {
  setInterval(detectSuspiciousUsers, 60 * 1000); // rulează la fiecare 1 minut
  console.log('Monitoring thread started...');
}

module.exports = startMonitoring;
