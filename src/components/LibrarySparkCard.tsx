"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MasonryCard } from "@/components/MasonryCard";
import { SparkActionsMenu } from "@/components/SparkActionsMenu";
import { SparkEditForm } from "@/components/SparkEditForm";
import { deleteSparkById } from "@/lib/actions";
import type { Spark } from "@/generated/prisma/client";

export function LibrarySparkCard({
  spark,
  collections,
  boardIds,
}: {
  spark: Spark;
  collections: { id: string; name: string }[];
  boardIds: string[];
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSparkById(spark.id);
      if (result.error) setError(result.error);
    });
  }

  if (mode === "edit") {
    return (
      <MasonryCard
        spark={spark}
        footer={
          <SparkEditForm
            spark={spark}
            collections={collections}
            boardIds={boardIds}
            onSaved={() => setMode("view")}
            onCancel={() => setMode("view")}
          />
        }
      />
    );
  }

  return (
    <div className="group relative">
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      >
        <Link href={`/spark/${spark.id}`}>
          <MasonryCard spark={spark} />
        </Link>
      </motion.div>
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
        <SparkActionsMenu
          onEdit={() => setMode("edit")}
          onDelete={handleDelete}
          disabled={isPending}
        />
        {error ? (
          <p className="max-w-[10rem] rounded-md bg-white/95 px-2 py-1 text-[0.65rem] text-red-600 shadow dark:bg-zinc-900/95 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
