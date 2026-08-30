const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All user routes require authentication
router.use(authMiddleware);

// Get current user profile
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Admin and Super Admin routes
router.get('/', authorize('super_admin', 'admin'), userController.getAllUsers);
router.get('/:id', authorize('super_admin', 'admin'), userController.getUserById);
router.post('/', authorize('super_admin', 'admin'), validate(schemas.createUser), userController.createUser);
router.put('/:id', authorize('super_admin', 'admin'), validate(schemas.updateUser), userController.updateUser);
router.delete('/:id', authorize('super_admin', 'admin'), userController.deleteUser);

module.exports = router;