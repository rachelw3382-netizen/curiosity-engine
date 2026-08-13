"use client";

import { useState, type ReactNode } from "react";
import { EmbedBlock } from "@/components/EmbedBlock";
import type { Spark } from "@/generated/prisma/client";

const providerLabel: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  web: "Web",
  instagram: "Instagram",
};

function WhySaved({ spark }: { spark: Spark }) {
  if (!spark.whySaved) return null;
  return (
    <p className="text-body mt-2 border-l-2 border-amber-300 pl-2.5 text-[0.7rem] italic text-zinc-500 dark:border-amber-700 dark:text-zinc-400">
      &ldquo;{spark.whySaved}&rdquo;
    </p>
  );
}

/**
 * Purely presentational — the whole card is wrapped in a click-to-expand
 * GallerySparkCard by the caller (see LibrarySparkCard), so nothing in here
 * navigates or links out on its own; that lives in the expanded preview.
 */
export function MasonryCard({
  spark,
  showDescription = true,
  footer,
}: {
  spark: Spark;
  showDescription?: boolean;
  /** Replaces the default title/description block below the media — used when editing. */
  footer?: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const cardShell =
    "rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08] overflow-hidden";

  if (spark.mediaType === "video" && spark.thumbnailUrl) {
    const ratio =
      spark.width && spark.height ? `${spark.width} / ${spark.height}` : "16 / 9";
    return (
      <div className={cardShell}>
        <div
          className="group relative w-full bg-zinc-100 dark:bg-zinc-900"
          style={{ aspectRatio: ratio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spark.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.6rem] font-medium text-white backdrop-blur">
            {providerLabel[spark.provider ?? "web"] ?? "Video"}
          </span>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow">
              ▶
            </span>
          </span>
        </div>
        <div className="p-3">
          {footer ?? (
            <>
              <h3 className="text-heading text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                {spark.title}
              </h3>
              {showDescription && spark.description ? (
                <p className="text-body mt-1 text-[0.7rem] text-zinc-500 dark:text-zinc-400">
                  {spark.description}
                </p>
              ) : null}
              {showDescription ? <WhySaved spark={spark} /> : null}
            </>
          )}
        </div>
      </div>
    );
  }

  if (spark.mediaType === "image" && spark.thumbnailUrl) {
    return (
      <div className={cardShell}>
        {imageFailed ? null : (
          <div className="w-full bg-zinc-100 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spark.thumbnailUrl}
              alt=""
              className="w-full"
              onError={() => setImageFailed(true)}
            />
          </div>
        )}
        <div className="p-3">
          {footer ?? (
            <>
              {spark.domain ? (
                <span className="text-caption text-[0.65rem] uppercase text-amber-700 dark:text-amber-400">
                  {spark.domain}
                </span>
              ) : null}
              <h3 className="text-heading mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                {spark.title}
              </h3>
              {showDescription && spark.description ? (
                <p className="text-body mt-1 text-[0.7rem] text-zinc-500 dark:text-zinc-400">
                  {spark.description}
                </p>
              ) : null}
              {showDescription ? <WhySaved spark={spark} /> : null}
            </>
          )}
        </div>
      </div>
    );
  }

  if (spark.mediaType === "embed" && spark.embedHtml) {
    return (
      <div className={cardShell}>
        <EmbedBlock html={spark.embedHtml} width={spark.width} height={spark.height} />
        <div className="p-3">
          {footer ?? (
            <>
              {spark.domain ? (
                <span className="text-caption text-[0.65rem] uppercase text-amber-700 dark:text-amber-400">
                  {spark.domain}
                </span>
              ) : null}
              <h3 className="text-heading mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                {spark.title}
              </h3>
              {/* No description here — embed capture never fetches metadata, so this field is
                  never legitimately populated for an embed spark (see SparkDetail/SparkEditForm). */}
              {showDescription ? <WhySaved spark={spark} /> : null}
            </>
          )}
        </div>
      </div>
    );
  }

  if (spark.type === "url") {
    return (
      <div className={`${cardShell} p-3`}>
        {footer ?? (
          <>
            <span className="text-caption text-[0.65rem] uppercase text-amber-700 dark:text-amber-400">
              {spark.domain ?? "Link"}
            </span>
            <h3 className="text-heading mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
              {spark.title}
            </h3>
            {showDescription && spark.description ? (
              <p className="text-body mt-1 text-[0.7rem] text-zinc-500 dark:text-zinc-400">
                {spark.description}
              </p>
            ) : null}
            {showDescription ? <WhySaved spark={spark} /> : null}
          </>
        )}
      </div>
    );
  }

  // Note / text spark — just the thought.
  return (
    <div className={`${cardShell} p-4`}>
      {footer ?? (
        <>
          <p className="font-serif text-[0.95rem] italic leading-relaxed tracking-[-0.005em] text-zinc-800 dark:text-zinc-100">
            {spark.title}
          </p>
          {showDescription && spark.description ? (
            <p className="text-body mt-2 text-[0.8rem] text-zinc-600 dark:text-zinc-300">
              {spark.description}
            </p>
          ) : null}
          {showDescription ? <WhySaved spark={spark} /> : null}
        </>
      )}
    </div>
  );
}
