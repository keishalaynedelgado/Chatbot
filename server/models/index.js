import { sequelize, testConnection } from '../database.js';
import Tenant from './Tenant.js';
import User from './User.js';
import Task from './Task.js';

// Define associations
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Task, { foreignKey: 'tenantId', as: 'tasks' });
Task.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

export {
  sequelize,
  testConnection,
  Tenant,
  User,
  Task
};

export default {
  sequelize,
  testConnection,
  Tenant,
  User,
  Task
};
