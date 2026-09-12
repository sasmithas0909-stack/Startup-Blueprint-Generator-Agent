// backend/src/services/rag/vectorStore.js
// ChromaDB vector store integration with in-memory fallback

import logger from '../../utils/logger.js';
import { loadAndEmbedKnowledgeBase, embedText } from './embedder.js';

// -------------------------------------------------------
// Simple in-memory vector store (cosine similarity)
// Used when ChromaDB is unavailable — works entirely locally
// -------------------------------------------------------

class InMemoryVectorStore {
  constructor() {
    this.documents = [];
  }

  add(documents) {
    this.documents.push(...documents);
  }

  query(queryEmbedding, topK = 5, where = null) {
    let docs = this.documents;

    // Apply metadata filter
    if (where) {
      const filterKey = Object.keys(where)[0];
      const filterOp = Object.keys(where[filterKey])[0]; // e.g. $eq
      const filterVal = where[filterKey][filterOp];
      if (filterOp === '$eq') {
        docs = docs.filter((d) => d.metadata[filterKey] === filterVal);
      }
    }

    if (docs.length === 0) return [];

    // Calculate cosine similarity
    const scored = docs.map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  size() {
    return this.documents.length;
  }
}

// -------------------------------------------------------
// Cosine similarity between two vectors
// -------------------------------------------------------
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// -------------------------------------------------------
// Singleton store instance
// -------------------------------------------------------
let storeInstance = null;
let isInitializing = false;
let initPromise = null;

export async function getVectorStore() {
  if (storeInstance) return storeInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    logger.info('Initializing in-memory vector store...');
    isInitializing = true;

    const store = new InMemoryVectorStore();
    const embeddedDocs = await loadAndEmbedKnowledgeBase();

    store.add(embeddedDocs);
    storeInstance = store;
    isInitializing = false;

    logger.info(`Vector store ready — ${store.size()} document chunks loaded`);
    return store;
  })();

  return initPromise;
}

// -------------------------------------------------------
// Query the store with a query embedding
// -------------------------------------------------------
export async function queryVectorStore(store, queryText, topK = 5, where = null) {
  const queryEmbedding = await embedText(queryText);
  const results = store.query(queryEmbedding, topK, where);

  return results.map((r) => ({
    document: r.text,
    metadata: r.metadata,
    score: r.score,
  }));
}
