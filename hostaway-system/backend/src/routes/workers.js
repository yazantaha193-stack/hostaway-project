const express = require('express');
const { query } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, rating, total_tasks, completed_tasks, status
       FROM workers WHERE status = 'active' ORDER BY rating DESC`
    );
    
    for (let worker of result.rows) {
      const activeTasks = await query(
        `SELECT COUNT(*) FROM cleaning_tasks 
         WHERE worker_id = $1 AND status IN ('assigned', 'in_progress')`,
        [worker.id]
      );
      worker.active_tasks = parseInt(activeTasks.rows[0].count);
    }
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, rating, total_tasks, completed_tasks, availability, language FROM workers WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
