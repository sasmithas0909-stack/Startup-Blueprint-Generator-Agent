// backend/src/services/rag/embedder.js
// Text embedding using TF-IDF + keyword approach (no external API needed)
// For production, replace with IBM Embedding Model via watsonx.ai

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, 'knowledgeBase');

// -------------------------------------------------------
// Simple TF-IDF based embedding (works fully offline)
// Vocabulary is built from the knowledge base
// -------------------------------------------------------

let vocabulary = null;
let idfScores = null;
const EMBEDDING_DIM = 512;

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildVocabulary(documents) {
  const allTokens = new Set();
  const docFrequency = {};

  documents.forEach((doc) => {
    const tokens = new Set(tokenize(doc));
    tokens.forEach((token) => {
      allTokens.add(token);
      docFrequency[token] = (docFrequency[token] || 0) + 1;
    });
  });

  // Keep top EMBEDDING_DIM most informative tokens
  const vocab = Array.from(allTokens)
    .filter((t) => docFrequency[t] >= 1 && docFrequency[t] <= documents.length * 0.8)
    .slice(0, EMBEDDING_DIM);

  const idf = {};
  const N = documents.length || 1;
  vocab.forEach((token) => {
    idf[token] = Math.log((N + 1) / ((docFrequency[token] || 0) + 1)) + 1;
  });

  return { vocab, idf };
}

export function embedText(text) {
  if (!vocabulary || !idfScores) {
    // Return a random-ish but deterministic embedding based on character codes
    // This is a fallback that allows keyword matching to still work
    const tokens = tokenize(text);
    const vec = new Array(EMBEDDING_DIM).fill(0);
    tokens.forEach((token) => {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 31 + token.charCodeAt(i)) % EMBEDDING_DIM;
      }
      vec[Math.abs(hash)] += 1;
    });
    // Normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }

  const tokens = tokenize(text);
  const termFreq = {};
  tokens.forEach((t) => { termFreq[t] = (termFreq[t] || 0) + 1; });

  const vec = vocabulary.map((token) => {
    const tf = (termFreq[token] || 0) / (tokens.length || 1);
    const idf = idfScores[token] || 0;
    return tf * idf;
  });

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

// -------------------------------------------------------
// Load all knowledge base documents, chunk them, embed them
// -------------------------------------------------------
export async function loadAndEmbedKnowledgeBase() {
  logger.info('Loading knowledge base documents...');

  const allDocs = [];
  const categories = ['schemes', 'funding', 'legal', 'market', 'policies'];

  for (const category of categories) {
    const dir = path.join(KB_DIR, category);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const chunks = chunkText(content, 600, 100);

      chunks.forEach((chunk, i) => {
        allDocs.push({
          text: chunk,
          metadata: {
            category,
            title: file.replace(/\.(md|txt)$/, '').replace(/-/g, ' '),
            file,
            chunkIndex: i,
            url: extractUrl(chunk),
          },
        });
      });
    }
  }

  logger.info(`Knowledge base: ${allDocs.length} chunks from ${categories.join(', ')}`);

  // Build vocabulary from all document texts
  const texts = allDocs.map((d) => d.text);
  const { vocab, idf } = buildVocabulary(texts);
  vocabulary = vocab;
  idfScores = idf;

  // Embed all documents
  const embedded = allDocs.map((doc) => ({
    ...doc,
    embedding: embedText(doc.text),
  }));

  return embedded;
}

// -------------------------------------------------------
// Chunk text into overlapping segments
// -------------------------------------------------------
function chunkText(text, chunkSize = 600, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

// -------------------------------------------------------
// Extract URL from text if present
// -------------------------------------------------------
function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}
