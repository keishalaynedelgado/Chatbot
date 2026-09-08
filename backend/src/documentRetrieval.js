/**
 * Vector similarity search over the shared document knowledge base.
 *
 * Embeddings are stored as plain FLOAT8[] arrays (see
 * models/DocumentChunk.js), so similarity is computed in Node rather
 * than via a pgvector operator — fine at the hundreds-to-low-thousands
 * chunk scale expected here; all "ready" chunks are fetched once per
 * query and scored in memory.
 */

import { Document, DocumentChunk } from './models/index.js';
import { embedText } from './embeddingService.js';

const MIN_SIMILARITY = 0.3;

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function retrieveRelevantChunks(query, { topK = 5 } = {}) {
  if (!query || !query.trim()) return [];

  const queryVector = await embedText(query);

  const chunks = await DocumentChunk.findAll({
    include: [{ model: Document, as: 'document', where: { status: 'ready' }, attributes: ['originalFilename'] }],
    attributes: ['content', 'chunkIndex', 'embedding'],
  });

  const scored = chunks
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length === queryVector.length)
    .map((c) => ({
      content: c.content,
      chunkIndex: c.chunkIndex,
      originalFilename: c.document.originalFilename,
      similarity: cosineSimilarity(queryVector, c.embedding),
    }))
    .filter((c) => c.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

/**
 * Builds a system-prompt context block from retrieved chunks, mirroring
 * departmentFilter.js's formatTaskTagContext style: labeled excerpts
 * plus an explicit "don't fabricate beyond this" instruction. Returns
 * '' when there's nothing relevant, so no prompt bloat is added.
 */
function formatChunksForPrompt(chunks) {
  if (!chunks || chunks.length === 0) return '';

  const excerpts = chunks.map((c, i) =>
    `[Excerpt ${i + 1} — from "${c.originalFilename}"]\n${c.content}`
  ).join('\n\n');

  return `### KNOWLEDGE BASE CONTEXT (${chunks.length} relevant excerpt${chunks.length === 1 ? '' : 's'} from uploaded documents):
${excerpts}

CRITICAL: If the user's question is answered by the excerpts above, answer using ONLY this information — do not add facts beyond what's written here. If the excerpts don't cover what the user is asking, say plainly that the knowledge base doesn't have that information rather than guessing or using general knowledge.`;
}

export { retrieveRelevantChunks, formatChunksForPrompt };
export default { retrieveRelevantChunks, formatChunksForPrompt };
