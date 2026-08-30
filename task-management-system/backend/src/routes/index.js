const express = require('express');
const router = express.Router();

// Import route files
const tenantRoutes = require('./tenantRoutes');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');
const aiRoutes = require('./aiRoutes');
const authRoutes = require('./authRoutes');
const reportRoutes = require('./reportRoutes');

// Mount routes
router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/ai', aiRoutes);
router.use('/auth', authRoutes);
router.use('/reports', reportRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;