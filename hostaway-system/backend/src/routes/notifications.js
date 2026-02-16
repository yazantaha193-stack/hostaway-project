const express = require('express');
const { query } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND user_type = $2 
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId, req.user.userType]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
