const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');
const { MODEL_CATALOG, DEFAULT_PROVIDER, DEFAULT_MODEL } = require('../config/aiConfig');

// AI Streaming Chat - Authenticated & Scoped
router.post('/chat/stream', authMiddleware, aiController.streamChatWithAI);
router.post('/stream', authMiddleware, aiController.streamChatWithAI);

// AI Standard Chat - Backward Compatibility
router.post('/chat', authMiddleware, aiController.chatWithAI);

// Available Model Catalog
router.get('/models', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      defaultProvider: DEFAULT_PROVIDER,
      defaultModel: DEFAULT_MODEL,
      models: MODEL_CATALOG
    }
  });
});

module.exports = router;