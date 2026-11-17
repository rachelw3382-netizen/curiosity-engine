import type { NextConfig } from "next";

// Base44 preview only (BASE44_PREVIEW_MODE === "1"): the preview proxy forwards the browser's
// public Origin (https://3000-<suffix>) while the dev server sees a different Host, so Next's
// dev-origin gate blocks its own /_next chunks and Server Actions inside the preview.
// With the flag unset (or any other value) this stays undefined and the config is unchanged.
const previewDevOrigins =
  process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : undefined;

const nextConfig: NextConfig = {
  // Explicit even though Next 16's default serverExternalPackages list already covers these —
  // cheap insurance against a future release changing that default. Used by src/lib/embeddings.ts
  // for local on-device sentence-embedding reranking (see CLAUDE.md Non-goals).
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  ...(previewDevOrigins ? { allowedDevOrigins: previewDevOrigins } : {}),
};

export default nextConfig;
