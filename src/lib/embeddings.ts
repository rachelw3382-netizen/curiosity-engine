import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import path from "node:path";

const MODEL_ID = "onnx-community/all-MiniLM-L6-v2-ONNX";
const EMBED_TIMEOUT_MS = 8000;

// Module-level singleton so the ~23MB quantized model loads once per server process, not
// once per request. Guarded on `globalThis` the same way src/lib/prisma.ts guards its client,
// so `next dev` Fast Refresh reloading this module doesn't reinitialize the pipeline.
const globalForEmbeddings = globalThis as unknown as {
  embeddingPipeline: Promise<FeatureExtractionPipeline> | undefined;
};

async function loadPipeline(): Promise<FeatureExtractionPipeline> {
  const { pipeline, env } = await import("@huggingface/transformers");
  // Survives `rm -rf node_modules && npm install` instead of redownloading the model
  // into node_modules' own default cache location every time.
  env.cacheDir = path.join(process.cwd(), ".cache", "transformers");
  // q8/"_quantized" isn't published for this particular ONNX repo (only fp32/fp16/q4/q4f16
  // are) — confirmed via the model's file listing. q4 is the smallest available and still
  // gives good sentence-similarity quality for this use case.
  return pipeline("feature-extraction", MODEL_ID, { dtype: "q4" });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Embedding timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Computes normalized sentence embeddings for a batch of short texts, entirely on-device
 * (no external API call, nothing leaves the machine). Returns null on any failure — missing
 * native binding, disk full, timeout — so callers can fall back to the keyword-based scorer
 * instead of surfacing an error.
 */
export async function embedTexts(texts: string[]): Promise<Float32Array[] | null> {
  try {
    if (!globalForEmbeddings.embeddingPipeline) {
      globalForEmbeddings.embeddingPipeline = loadPipeline();
    }
    const extractor = await withTimeout(globalForEmbeddings.embeddingPipeline, EMBED_TIMEOUT_MS);
    const output = await withTimeout(
      extractor(texts, { pooling: "mean", normalize: true }),
      EMBED_TIMEOUT_MS,
    );
    return (output.tolist() as number[][]).map((vector) => Float32Array.from(vector));
  } catch {
    // Reset the singleton so a transient failure (e.g. a timed-out first download) doesn't
    // permanently wedge every future call behind the same rejected promise.
    globalForEmbeddings.embeddingPipeline = undefined;
    return null;
  }
}
