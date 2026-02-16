const express = require('express');
const { query } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { syncAllAccounts } = require('../services/hostawayService');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, hostaway_account_id, status, created_at FROM accounts ORDER BY name'
    );
    
    for (let account of result.rows) {
      const propsResult = await query(
        'SELECT COUNT(*) FROM properties WHERE account_id = $1',
        [account.id]
      );
      const bookingsResult = await query(
        'SELECT COUNT(*) FROM bookings WHERE account_id = $1 AND check_in > NOW()',
        [account.id]
      );
      
      account.properties_count = parseInt(propsResult.rows[0].count);
      account.upcoming_bookings = parseInt(bookingsResult.rows[0].count);
    }
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const results = await syncAllAccounts();
    res.json({ message: 'Sync completed', results });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

module.exports = router;
