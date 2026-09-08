import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

export const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  companyName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subscriptionPlan: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
    defaultValue: 'basic'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  timestamps: true,
  tableName: 'tenants'
});

export default Tenant;
