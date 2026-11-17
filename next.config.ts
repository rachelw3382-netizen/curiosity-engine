import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit even though Next 16's default serverExternalPackages list already covers these —
  // cheap insurance against a future release changing that default. Used by src/lib/embeddings.ts
  // for local on-device sentence-embedding reranking (see "Technical highlights" in README.md).
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
