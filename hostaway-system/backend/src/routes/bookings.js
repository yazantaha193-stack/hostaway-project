const express = require('express');
const { query } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { accountId, propertyId, startDate, endDate } = req.query;
    
    let queryText = `
      SELECT b.*, p.name as property_name, a.name as account_name,
             t.id as task_id, t.status as task_status
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN accounts a ON b.account_id = a.id
      LEFT JOIN cleaning_tasks t ON b.id = t.booking_id
      WHERE 1=1
    `;
    
    const params = [];
    if (accountId) {
      params.push(accountId);
      queryText += ` AND b.account_id = $${params.length}`;
    }
    if (propertyId) {
      params.push(propertyId);
      queryText += ` AND b.property_id = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      queryText += ` AND b.check_in >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      queryText += ` AND b.check_out <= $${params.length}`;
    }
    
    queryText += ' ORDER BY b.check_in ASC';
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
