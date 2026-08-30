const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All task routes require authentication
router.use(authMiddleware);

// Get tasks assigned to current user (Staff can access this)
router.get('/my-tasks', taskController.getMyTasks);

// Main task routes
router.get('/', authorize('super_admin', 'admin'), taskController.getAllTasks);
router.get('/:id', authorize('super_admin', 'admin'), taskController.getTaskById);
router.post('/', authorize('super_admin', 'admin'), validate(schemas.createTask), taskController.createTask);
router.put('/:id', authorize('super_admin', 'admin', 'staff'), validate(schemas.updateTask), taskController.updateTask);
router.delete('/:id', authorize('super_admin', 'admin'), taskController.deleteTask);

module.exports = router;