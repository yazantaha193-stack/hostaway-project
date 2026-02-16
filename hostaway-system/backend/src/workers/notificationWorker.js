const Bull = require('bull');
const { query } = require('../database/init');
const logger = require('../utils/logger');

const notificationQueue = new Bull('notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Process notification jobs
notificationQueue.process(async (job) => {
  const { type, userId, userType, data } = job.data;
  
  logger.info(`Processing notification: ${type} for ${userType} ${userId}`);
  
  try {
    // Save notification to database
    await query(
      `INSERT INTO notifications (user_id, user_type, type, title, body, data, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, userType, type, data.title, data.body, JSON.stringify(data)]
    );
    
    // TODO: Send actual push notification via FCM
    // TODO: Send SMS if urgent via Twilio
    
    logger.info(`Notification sent successfully to ${userType} ${userId}`);
  } catch (error) {
    logger.error('Notification error:', error);
    throw error;
  }
});

// Schedule task reminders
async function scheduleTaskReminders() {
  const tasks = await query(
    `SELECT t.id, t.scheduled_time, t.worker_id, p.name as property_name
     FROM cleaning_tasks t
     JOIN properties p ON t.property_id = p.id
     WHERE t.status = 'assigned' 
     AND t.scheduled_time > NOW()
     AND t.scheduled_time < NOW() + INTERVAL '24 hours'`
  );

  for (const task of tasks.rows) {
    const hoursUntil = Math.floor(
      (new Date(task.scheduled_time) - new Date()) / (1000 * 60 * 60)
    );
    
    if ([24, 2].includes(hoursUntil)) {
      await notificationQueue.add({
        type: 'task_reminder',
        userId: task.worker_id,
        userType: 'worker',
        data: {
          title: 'تذكير بمهمة التنظيف',
          body: `لديك مهمة تنظيف في ${task.property_name} بعد ${hoursUntil} ساعة`,
          taskId: task.id
        }
      });
    }
  }
}

// Run every hour
setInterval(scheduleTaskReminders, 60 * 60 * 1000);

logger.info('Notification worker started');
