import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

export const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  originalFilename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  storedFilename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  sizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('processing', 'ready', 'failed'),
    defaultValue: 'processing'
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  chunkCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'documents'
});

export default Document;
