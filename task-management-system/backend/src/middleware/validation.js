const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  // Tenant validation
  createTenant: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    companyName: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    subscriptionPlan: Joi.string().valid('basic', 'premium', 'enterprise').default('basic')
  }),

  updateTenant: Joi.object({
    name: Joi.string().min(3).max(100),
    companyName: Joi.string().min(3).max(100),
    email: Joi.string().email(),
    phone: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    subscriptionPlan: Joi.string().valid('basic', 'premium', 'enterprise'),
    isActive: Joi.boolean()
  }),

  // User validation
  createUser: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('admin', 'staff').required(),
    tenantId: Joi.string().uuid().required()
  }),

  updateUser: Joi.object({
    username: Joi.string().min(3).max(50),
    email: Joi.string().email(),
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    role: Joi.string().valid('admin', 'staff'),
    isActive: Joi.boolean()
  }),

  // Task validation
  createTask: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').default('pending'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    dueDate: Joi.date().allow(null),
    assignedTo: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string())
  }),

  updateTask: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().allow('', null),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    dueDate: Joi.date().allow(null),
    assignedTo: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string())
  }),

  // AI Chat validation
  aiChat: Joi.object({
    message: Joi.string().min(1).max(5000).required(),
    context: Joi.object().default({})
  })
};

module.exports = { validate, schemas };