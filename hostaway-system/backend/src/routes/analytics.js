const express = require('express');
const { query } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const stats = {};
    
    const totalAccounts = await query('SELECT COUNT(*) FROM accounts WHERE status = $1', ['active']);
    stats.totalAccounts = parseInt(totalAccounts.rows[0].count);
    
    const todayTasks = await query(
      `SELECT COUNT(*) FROM cleaning_tasks 
       WHERE DATE(scheduled_time) = CURRENT_DATE`
    );
    stats.todayTasks = parseInt(todayTasks.rows[0].count);
    
    const availableWorkers = await query(
      `SELECT COUNT(*) FROM workers WHERE status = 'active' 
       AND id NOT IN (
         SELECT worker_id FROM cleaning_tasks 
         WHERE status = 'in_progress' AND worker_id IS NOT NULL
       )`
    );
    stats.availableWorkers = parseInt(availableWorkers.rows[0].count);
    
    const inProgress = await query(
      `SELECT COUNT(*) FROM cleaning_tasks WHERE status = 'in_progress'`
    );
    stats.inProgress = parseInt(inProgress.rows[0].count);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
