const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

async function initRedis() {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.on('connect', () => logger.info('Redis connected'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

async function getRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    await initRedis();
  }
  return redisClient;
}

module.exports = {
  initRedis,
  getRedisClient
};
