import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

// embedding is stored as a plain PostgreSQL FLOAT8[] array rather than
// a pgvector `vector` column — no Postgres extension required. Cosine
// similarity is computed in Node at query time (see
// documentRetrieval.js), which is plenty fast at the hundreds-to-low-
// thousands-of-chunks scale expected for an internal knowledge base.
export const DocumentChunk = sequelize.define('DocumentChunk', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  chunkIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tokenCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  embedding: {
    type: DataTypes.ARRAY(DataTypes.FLOAT),
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'document_chunks'
});

export default DocumentChunk;
