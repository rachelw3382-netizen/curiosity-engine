"use client";

import { useState, useTransition } from "react";
import { BoardPicker } from "@/components/BoardPicker";
import { updateSpark } from "@/lib/actions";
import type { Spark } from "@/generated/prisma/client";

const fieldClass =
  "text-body rounded-lg border border-black/[.08] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]";

export function SparkEditForm({
  spark,
  collections,
  boardIds,
  onSaved,
  onCancel,
}: {
  spark: Spark;
  collections: { id: string; name: string }[];
  boardIds: string[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNote = spark.type === "note";
  const isEmbed = spark.type === "embed";

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateSpark({
        id: spark.id,
        title: String(formData.get("title") ?? ""),
        description: isNote ? String(formData.get("description") ?? "") : undefined,
        whySaved: isNote ? undefined : String(formData.get("whySaved") ?? ""),
        url: isEmbed ? String(formData.get("url") ?? "") : undefined,
        collectionIds: formData.getAll("collectionIds").map(String),
        newBoardName: String(formData.get("newBoardName") ?? ""),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onSaved();
      }
    });
  }

  return (
    <form action={handleSave} className="flex flex-col gap-3">
      <input
        type="text"
        name="title"
        defaultValue={spark.title ?? ""}
        required
        className={`${fieldClass} text-heading font-medium`}
      />
      {spark.type === "url" && spark.description ? (
        <p className="text-body text-xs text-zinc-500 dark:text-zinc-400">{spark.description}</p>
      ) : null}
      {isEmbed ? (
        <input
          type="url"
          name="url"
          defaultValue={spark.url ?? ""}
          placeholder="Link to the original video/post"
          className={fieldClass}
        />
      ) : null}
      <textarea
        name={isNote ? "description" : "whySaved"}
        defaultValue={(isNote ? spark.description : spark.whySaved) ?? ""}
        rows={5}
        placeholder="Write more"
        className={`${fieldClass} resize-none`}
      />
      <BoardPicker collections={collections} defaultSelected={boardIds} />

      {error ? (
        <p className="text-body text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
