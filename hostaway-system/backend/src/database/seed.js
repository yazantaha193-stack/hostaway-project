require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./init');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await query(
      `INSERT INTO admin_users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin User', 'admin@example.com', adminPassword, 'admin']
    );
    logger.info('✅ Admin user created (email: admin@example.com, password: admin123)');

    // Create sample workers
    const workerPassword = await bcrypt.hash('worker123', 10);
    const workers = [
      { name: 'أحمد محمد', email: 'ahmad@example.com', phone: '+962791234567' },
      { name: 'سارة أحمد', email: 'sara@example.com', phone: '+962781234567' },
      { name: 'محمود خالد', email: 'mahmoud@example.com', phone: '+962771234567' },
      { name: 'فاطمة علي', email: 'fatima@example.com', phone: '+962791234568' }
    ];

    for (const worker of workers) {
      await query(
        `INSERT INTO workers (name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [worker.name, worker.email, worker.phone, workerPassword]
      );
    }
    logger.info('✅ Sample workers created (password: worker123)');

    // Create sample Hostaway accounts
    const accounts = [
      { name: 'عقارات النخيل', id: 'account_1' },
      { name: 'فلل البحر الأحمر', id: 'account_2' },
      { name: 'شقق عمان الحديثة', id: 'account_3' }
    ];

    for (const account of accounts) {
      await query(
        `INSERT INTO accounts (name, hostaway_account_id, api_key, api_secret)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (hostaway_account_id) DO NOTHING`,
        [account.name, account.id, 'demo_api_key', 'demo_api_secret']
      );
    }
    logger.info('✅ Sample accounts created');

    logger.info('🎉 Database seeding completed!');
  } catch (error) {
    logger.error('Seeding error:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
