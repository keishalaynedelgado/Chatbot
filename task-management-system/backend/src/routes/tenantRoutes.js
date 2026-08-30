const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All tenant routes require authentication and super admin role
router.use(authMiddleware);
router.use(authorize('super_admin'));

router.get('/', tenantController.getAllTenants);
router.get('/:id', tenantController.getTenantById);
router.post('/', validate(schemas.createTenant), tenantController.createTenant);
router.put('/:id', validate(schemas.updateTenant), tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);

module.exports = router;