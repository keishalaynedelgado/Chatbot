/**
 * Orchestrates turning an uploaded file into searchable knowledge-base
 * chunks: extract text -> guardrail-check it -> chunk it -> embed each
 * chunk -> store. Called from the /api/documents/upload route.
 *
 * Until the RAG schema exists (run once via `npm run db:rag-setup`),
 * DB writes below are expected to fail — that's surfaced as a clear
 * 'failed' result with reason 'schema-not-ready', not swallowed silently.
 */

import fs from 'fs/promises';
import path from 'path';
import { extractText, chunkText } from './documentProcessor.js';
import { embedBatch } from './embeddingService.js';
import { runGuardrails } from './guardrails.js';
import { Document, DocumentChunk } from './models/index.js';

const EXTENSION_MIME_MAP = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

async function ingestDocument({ filePath, originalFilename, storedFilename, mimeType, sizeBytes }) {
  let document;
  try {
    document = await Document.create({
      originalFilename,
      storedFilename,
      mimeType,
      sizeBytes,
      status: 'processing'
    });
  } catch (dbErr) {
    console.warn('[DocumentIngestion] DB write failed — RAG schema not yet applied (run `npm run db:rag-setup`):', dbErr.message);
    return { documentId: null, status: 'failed', reason: 'schema-not-ready' };
  }

  try {
    const rawText = await extractText(filePath, mimeType, originalFilename);

    const guardrailResult = runGuardrails(rawText);
    if (!guardrailResult.allowed) {
      await document.update({ status: 'failed', failureReason: guardrailResult.reason || 'Blocked by guardrails' });
      return { documentId: document.id, status: 'failed', reason: guardrailResult.reason };
    }
    const text = guardrailResult.category === 'pii_masked' ? guardrailResult.sanitizedContent : rawText;

    const chunks = chunkText(text, { chunkSize: 750, overlapRatio: 0.125 });
    if (chunks.length === 0) {
      await document.update({ status: 'failed', failureReason: 'No extractable text content' });
      return { documentId: document.id, status: 'failed', reason: 'No extractable text content' };
    }

    const embeddings = await embedBatch(chunks);

    try {
      const rows = chunks.map((content, i) => ({
        documentId: document.id,
        chunkIndex: i,
        content,
        tokenCount: content.split(/\s+/).length,
        embedding: embeddings[i]
      }));
      await DocumentChunk.bulkCreate(rows);
    } catch (dbErr) {
      console.warn('[DocumentIngestion] DB write failed — RAG schema not yet applied (run `npm run db:rag-setup`):', dbErr.message);
      await document.update({ status: 'failed', failureReason: 'schema-not-ready' }).catch(() => {});
      return { documentId: document.id, status: 'failed', reason: 'schema-not-ready' };
    }

    await document.update({ status: 'ready', chunkCount: chunks.length });
    return { documentId: document.id, status: 'ready', chunkCount: chunks.length };
  } catch (err) {
    await document.update({ status: 'failed', failureReason: err.message }).catch(() => {});
    return { documentId: document.id, status: 'failed', reason: err.message };
  }
}

/**
 * Scans `uploadedDocsDir` for files that aren't yet tracked in the
 * `documents` table (matched by storedFilename) and ingests each one —
 * covers files dropped directly into the folder rather than uploaded
 * through /api/documents/upload. Unsupported extensions are skipped.
 */
async function syncUploadedFolder(uploadedDocsDir) {
  const filenames = await fs.readdir(uploadedDocsDir);
  const existing = await Document.findAll({ attributes: ['storedFilename'] });
  const known = new Set(existing.map((d) => d.storedFilename));

  const ingested = [];
  const skipped = [];

  for (const filename of filenames) {
    if (known.has(filename)) continue;

    const ext = path.extname(filename).toLowerCase();
    const mimeType = EXTENSION_MIME_MAP[ext];
    if (!mimeType) {
      skipped.push({ filename, reason: `Unsupported extension: ${ext}` });
      continue;
    }

    const filePath = path.join(uploadedDocsDir, filename);
    const stat = await fs.stat(filePath);
    const result = await ingestDocument({
      filePath,
      originalFilename: filename,
      storedFilename: filename,
      mimeType,
      sizeBytes: stat.size,
    });
    ingested.push({ filename, ...result });
  }

  return { ingested, skipped };
}

export { ingestDocument, syncUploadedFolder };
export default { ingestDocument, syncUploadedFolder };
