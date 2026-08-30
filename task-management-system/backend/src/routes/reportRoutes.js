/**
 * Report & Analytics Routes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/auth');

// Scoped Analytics Query
router.get('/analytics', authMiddleware, reportController.getAnalytics);

// LLM AI Report Generation
router.post('/generate-ai-report', authMiddleware, reportController.generateAIReport);

module.exports = router;
