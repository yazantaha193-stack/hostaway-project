const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../database/init');
const logger = require('../utils/logger');
const { validateLoginInput, validateRegisterInput } = require('../utils/validation');

const router = express.Router();

// Generate JWT tokens
function generateTokens(userId, userType, role = null) {
  const accessToken = jwt.sign(
    { userId, userType, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

// POST /api/auth/login/admin - Admin login
router.post('/login/admin', async (req, res) => {
  try {
    const { error } = validateLoginInput(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;

    // Find admin user
    const result = await query(
      'SELECT * FROM admin_users WHERE email = $1 AND status = $2',
      [email, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, 'admin', user.role);

    // Save refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, user_type, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
      [user.id, 'admin', refreshToken]
    );

    // Update last login
    await query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`Admin login: ${email}`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login/worker - Worker login
router.post('/login/worker', async (req, res) => {
  try {
    const { error } = validateLoginInput(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, fcmToken } = req.body;

    // Find worker
    const result = await query(
      'SELECT * FROM workers WHERE email = $1 AND status = $2',
      [email, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const worker = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, worker.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update FCM token if provided
    if (fcmToken) {
      await query(
        'UPDATE workers SET fcm_token = $1 WHERE id = $2',
        [fcmToken, worker.id]
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(worker.id, 'worker');

    // Save refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, user_type, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
      [worker.id, 'worker', refreshToken]
    );

    logger.info(`Worker login: ${email}`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        rating: parseFloat(worker.rating),
        language: worker.language
      }
    });
  } catch (error) {
    logger.error('Worker login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register/worker - Worker registration
router.post('/register/worker', async (req, res) => {
  try {
    const { error } = validateRegisterInput(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, phone, password, language } = req.body;

    // Check if email already exists
    const existing = await query(
      'SELECT id FROM workers WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Create worker
    const result = await query(
      `INSERT INTO workers (name, email, phone, password_hash, language) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, phone, language`,
      [name, email, phone, passwordHash, language || 'ar']
    );

    const worker = result.rows[0];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(worker.id, 'worker');

    logger.info(`Worker registered: ${email}`);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: worker
    });
  } catch (error) {
    logger.error('Worker registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Check if refresh token exists in database
    const result = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, userType: decoded.userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ accessToken });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
