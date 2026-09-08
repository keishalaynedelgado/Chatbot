/**
 * One-off setup script for the RAG knowledge base schema. Run manually
 * once — never invoked automatically from server.js, consistent with
 * this codebase never calling sequelize.sync().
 *
 * Embeddings are stored as a plain PostgreSQL FLOAT8[] array rather
 * than a pgvector `vector` column (pgvector requires a Postgres
 * extension built from source on Windows, which needs disk space and
 * a build toolchain not available on this machine). Similarity search
 * is done in Node instead — see src/documentRetrieval.js.
 *
 * Usage: npm run db:rag-setup
 */

import { sequelize } from '../src/database.js';

const statements = [
  {
    label: 'Create documents table',
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY,
        "originalFilename" VARCHAR(255) NOT NULL,
        "storedFilename" VARCHAR(255) NOT NULL,
        "mimeType" VARCHAR(100) NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        "failureReason" TEXT,
        "chunkCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `
  },
  {
    label: 'Create document_chunks table',
    sql: `
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY,
        "documentId" UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        "chunkIndex" INTEGER NOT NULL,
        content TEXT NOT NULL,
        "tokenCount" INTEGER,
        embedding DOUBLE PRECISION[],
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `
  }
];

async function run() {
  for (const { label, sql } of statements) {
    try {
      await sequelize.query(sql);
      console.log(`✅ ${label}`);
    } catch (err) {
      console.error(`❌ ${label} — ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }
  console.log('RAG schema setup complete.');
}

run().finally(() => sequelize.close());
