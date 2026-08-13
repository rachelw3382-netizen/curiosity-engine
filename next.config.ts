import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit even though Next 16's default serverExternalPackages list already covers these —
  // cheap insurance against a future release changing that default. Used by src/lib/embeddings.ts
  // for local on-device sentence-embedding reranking (see CLAUDE.md Non-goals).
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
