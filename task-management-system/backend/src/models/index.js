const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');
const Task = require('./Task');

// Define associations
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Task, { foreignKey: 'tenantId', as: 'tasks' });
Task.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = {
  sequelize,
  Tenant,
  User,
  Task
};