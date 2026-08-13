"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmbedBlock } from "@/components/EmbedBlock";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { RelatedContent } from "@/components/RelatedContent";
import { SparkActionsMenu } from "@/components/SparkActionsMenu";
import { SparkEditForm } from "@/components/SparkEditForm";
import { deleteSparkById } from "@/lib/actions";
import type { RelatedContentResult } from "@/lib/related-content";
import type { Spark } from "@/generated/prisma/client";

const providerLabel: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  web: "Web",
  instagram: "Instagram",
};

export function SparkDetail({
  spark,
  collections,
  boardIds,
  boardNames,
  relatedContent,
}: {
  spark: Spark;
  collections: { id: string; name: string }[];
  boardIds: string[];
  boardNames: string[];
  relatedContent: RelatedContentResult;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSparkById(spark.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/library");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-body text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          &larr; Back
        </button>
        {mode === "view" ? (
          <SparkActionsMenu
            alwaysVisible
            onEdit={() => setMode("edit")}
            onDelete={handleDelete}
            disabled={isPending}
          />
        ) : null}
      </div>
      {error ? <p className="text-body text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <article className="flex flex-col gap-5">
        {spark.domain === "instagram.com" && spark.embedHtml ? (
          <InstagramEmbed html={spark.embedHtml} />
        ) : spark.mediaType === "embed" && spark.embedHtml ? (
          <EmbedBlock html={spark.embedHtml} width={spark.width} height={spark.height} />
        ) : spark.thumbnailUrl ? (
          spark.url ? (
            <a
              href={spark.url}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spark.thumbnailUrl} alt="" className="w-full" />
            </a>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spark.thumbnailUrl} alt="" className="w-full" />
            </div>
          )
        ) : null}

        {mode === "edit" ? (
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]">
            <SparkEditForm
              spark={spark}
              collections={collections}
              boardIds={boardIds}
              onSaved={() => setMode("view")}
              onCancel={() => setMode("view")}
            />
          </div>
        ) : (
          <>
            {spark.provider || spark.domain ? (
              <span className="text-caption w-fit text-xs uppercase text-amber-700 dark:text-amber-400">
                {providerLabel[spark.provider ?? ""] ?? spark.domain}
              </span>
            ) : null}

            <h1 className="text-display text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {spark.url ? (
                <a href={spark.url} target="_blank" rel="noreferrer">
                  {spark.title}
                </a>
              ) : (
                spark.title
              )}
            </h1>

            {(spark.type === "url" || spark.type === "note") && spark.description ? (
              <p className="text-body text-base leading-7 text-zinc-700 dark:text-zinc-300">
                {spark.description}
              </p>
            ) : null}

            {spark.whySaved ? (
              <p className="text-body border-l-2 border-amber-300 pl-3 text-sm italic text-zinc-500 dark:border-amber-700 dark:text-zinc-400">
                &ldquo;{spark.whySaved}&rdquo;
              </p>
            ) : null}

            {spark.url ? (
              <a
                href={spark.url}
                target="_blank"
                rel="noreferrer"
                className="text-body w-fit text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Open original source &rarr;
              </a>
            ) : null}

            {boardNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {boardNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-black/[.08] px-3 py-1 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}
      </article>

      {mode === "view" ? <RelatedContent content={relatedContent} /> : null}
    </div>
  );
}
