const express = require('express');
const { query } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/tasks - Get all tasks with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, workerId, propertyId, startDate, endDate } = req.query;
    
    let queryText = `
      SELECT t.*, p.name as property_name, p.address, 
             w.name as worker_name, w.phone as worker_phone,
             b.check_in, b.check_out, b.guest_name
      FROM cleaning_tasks t
      JOIN properties p ON t.property_id = p.id
      LEFT JOIN workers w ON t.worker_id = w.id
      LEFT JOIN bookings b ON t.booking_id = b.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (workerId) {
      queryText += ` AND t.worker_id = $${paramIndex}`;
      params.push(workerId);
      paramIndex++;
    }

    if (propertyId) {
      queryText += ` AND t.property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND t.scheduled_time >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND t.scheduled_time <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    queryText += ' ORDER BY t.scheduled_time ASC';

    const result = await query(queryText, params);
    
    // Get checklist for each task
    for (let task of result.rows) {
      const checklistResult = await query(
        'SELECT * FROM task_checklist_items WHERE task_id = $1 ORDER BY order_index',
        [task.id]
      );
      task.checklist = checklistResult.rows;
    }

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, p.name as property_name, p.address, p.access_instructions,
              w.name as worker_name, w.phone as worker_phone,
              b.check_in, b.check_out, b.guest_name
       FROM cleaning_tasks t
       JOIN properties p ON t.property_id = p.id
       LEFT JOIN workers w ON t.worker_id = w.id
       LEFT JOIN bookings b ON t.booking_id = b.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];

    // Get checklist
    const checklistResult = await query(
      'SELECT * FROM task_checklist_items WHERE task_id = $1 ORDER BY order_index',
      [task.id]
    );
    task.checklist = checklistResult.rows;

    res.json(task);
  } catch (error) {
    logger.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/assign - Assign worker to task
router.put('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.body;

    // Verify worker exists and is available
    const workerResult = await query(
      'SELECT id, name FROM workers WHERE id = $1 AND status = $2',
      [workerId, 'active']
    );

    if (workerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found or inactive' });
    }

    // Update task
    const result = await query(
      'UPDATE cleaning_tasks SET worker_id = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [workerId, 'assigned', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log history
    await query(
      'INSERT INTO task_history (task_id, status, changed_by, changed_by_type, notes) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'assigned', req.user.userId, req.user.userType, `Assigned to ${workerResult.rows[0].name}`]
    );

    logger.info(`Task ${req.params.id} assigned to worker ${workerId}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error assigning task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/start - Start task
router.put('/:id/start', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'UPDATE cleaning_tasks SET status = $1, started_at = NOW(), updated_at = NOW() WHERE id = $2 AND worker_id = $3 RETURNING *',
      ['in_progress', req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error starting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/complete - Complete task
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { workerNotes } = req.body;

    const result = await query(
      `UPDATE cleaning_tasks 
       SET status = $1, completed_at = NOW(), 
           actual_duration = EXTRACT(EPOCH FROM (NOW() - started_at))/60,
           worker_notes = $2,
           updated_at = NOW()
       WHERE id = $3 AND worker_id = $4 
       RETURNING *`,
      ['completed', workerNotes, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    // Update worker stats
    await query(
      'UPDATE workers SET completed_tasks = completed_tasks + 1, total_tasks = total_tasks + 1 WHERE id = $1',
      [req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/checklist/:itemId - Update checklist item
router.put('/:id/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const { completed } = req.body;

    const result = await query(
      'UPDATE task_checklist_items SET completed = $1, completed_at = $2 WHERE id = $3 AND task_id = $4 RETURNING *',
      [completed, completed ? new Date() : null, req.params.itemId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
