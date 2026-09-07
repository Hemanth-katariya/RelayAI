// Deterministic 1536-dimensional feature hashing embedding
// Provides instant offline semantic vector search with pgvector without requiring paid API keys,
// while supporting AI embeddings when an API key is configured.
export function generateOfflineEmbedding(text: string, dim = 1536): number[] {
  const vec = new Float64Array(dim);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "so", "as", "at", "by", "for",
    "from", "in", "into", "of", "off", "on", "onto", "out", "over", "to", "up", "with",
    "is", "was", "are", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him", "his",
    "she", "her", "it", "its", "they", "them", "their", "this", "that", "these", "those"
  ]);

  const words = clean.split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));

  // Unigrams and bigrams for strong vocabulary representation
  const tokens: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`);
  }

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vec[idx] += sign;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1;

  const result: number[] = new Array(dim);
  for (let i = 0; i < dim; i++) {
    result[i] = Number((vec[i] / norm).toFixed(6));
  }
  return result;
}
