const cron = require('node-cron');
const { syncAllAccounts } = require('../services/hostawayService');
const logger = require('../utils/logger');

// Sync every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  logger.info('Starting scheduled Hostaway sync...');
  try {
    const results = await syncAllAccounts();
    logger.info('Sync completed:', results);
  } catch (error) {
    logger.error('Sync failed:', error);
  }
});

logger.info('Sync worker started - will run every 30 minutes');
