// "Own algorithm" scoring for same-source related-content candidates. Two scorers:
// - rankCandidates: zero-dependency term-frequency cosine similarity, blended with recency.
// - rankCandidatesBySimilarity: local sentence-embedding cosine similarity (src/lib/embeddings.ts),
//   same recency blend, ranks by meaning instead of keyword overlap.
// rankRelatedCandidates tries the embedding scorer first and falls back to the keyword scorer
// if the model is unavailable — "capture should never be blocked" extended to rendering.

import { embedTexts } from "@/lib/embeddings";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those",
  "it", "its", "as", "by", "from", "how", "why", "what", "when", "where", "who",
  "you", "your", "we", "our", "i", "my", "not", "no", "do", "does", "did", "can",
  "will", "just", "about", "into", "out", "up", "down", "if", "so", "than", "then",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function termFrequency(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [term, count] of a) {
    const other = b.get(term);
    if (other) dot += count * other;
  }
  if (dot === 0) return 0;
  const magnitude = (map: Map<string, number>) =>
    Math.sqrt([...map.values()].reduce((sum, count) => sum + count * count, 0));
  return dot / (magnitude(a) * magnitude(b));
}

const RECENCY_HALF_LIFE_DAYS = 30;
const RECENCY_WEIGHT = 0.15;

export function recencyBoost(publishedAt: string | undefined): number {
  if (!publishedAt) return 0;
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return RECENCY_WEIGHT * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

export interface ScorableCandidate {
  title: string;
  description?: string;
  publishedAt?: string;
}

/** Ranks candidates against the origin spark's text, most relevant first. */
export function rankCandidates<T extends ScorableCandidate>(
  origin: { title: string; description?: string },
  candidates: T[],
  limit: number,
): T[] {
  const originVector = termFrequency(`${origin.title} ${origin.description ?? ""}`);
  return candidates
    .map((candidate) => {
      const candidateVector = termFrequency(`${candidate.title} ${candidate.description ?? ""}`);
      const score = cosineSimilarity(originVector, candidateVector) + recencyBoost(candidate.publishedAt);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

function vectorCosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Ranks candidates by local sentence-embedding similarity to the origin spark's text.
 * Returns null (not an error) if embeddings are unavailable, so callers can fall back.
 */
export async function rankCandidatesBySimilarity<T extends ScorableCandidate>(
  origin: { title: string; description?: string },
  candidates: T[],
  limit: number,
): Promise<T[] | null> {
  if (candidates.length === 0) return [];

  const texts = [
    `${origin.title} ${origin.description ?? ""}`,
    ...candidates.map((candidate) => `${candidate.title} ${candidate.description ?? ""}`),
  ];
  const vectors = await embedTexts(texts);
  if (!vectors) return null;

  const [originVector, ...candidateVectors] = vectors;
  return candidates
    .map((candidate, i) => {
      const score = vectorCosineSimilarity(originVector, candidateVectors[i]) + recencyBoost(candidate.publishedAt);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

/** Ranks by semantic similarity when available, falling back to keyword-based ranking otherwise. */
export async function rankRelatedCandidates<T extends ScorableCandidate>(
  origin: { title: string; description?: string },
  candidates: T[],
  limit: number,
): Promise<T[]> {
  try {
    const bySimilarity = await rankCandidatesBySimilarity(origin, candidates, limit);
    if (bySimilarity) return bySimilarity;
  } catch {
    // fall through to keyword-based ranking
  }
  return rankCandidates(origin, candidates, limit);
}
