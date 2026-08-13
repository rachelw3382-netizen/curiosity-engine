"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Spark } from "@/generated/prisma/client";

type SparkWithBoards = Spark & { collections: { collectionId: string }[] };

export function AddSparkPanel({
  sparks,
  boards,
  onAdd,
  onAddMany,
  onClose,
}: {
  sparks: SparkWithBoards[];
  boards: { id: string; name: string }[];
  onAdd: (sparkId: string) => void;
  onAddMany: (sparkIds: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function handlePointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sparks.filter((spark) => {
      if (q && !spark.title?.toLowerCase().includes(q)) return false;
      if (selectedBoard && !spark.collections.some((c) => c.collectionId === selectedBoard)) {
        return false;
      }
      return true;
    });
  }, [sparks, query, selectedBoard]);

  return (
    <div
      ref={panelRef}
      className="absolute bottom-16 left-4 z-20 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/[.08] dark:bg-zinc-900 dark:ring-white/[.1]"
    >
      <div className="flex items-center justify-between border-b border-black/[.06] px-4 py-3 dark:border-white/[.08]">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add sparks</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900/[.06] dark:text-zinc-400 dark:hover:bg-white/[.1]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder="Search your sparks…"
          className="text-body w-full rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
        />

        {boards.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedBoard(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                selectedBoard === null
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "border border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
              }`}
            >
              All
            </button>
            {boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedBoard(board.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  selectedBoard === board.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "border border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
                }`}
              >
                {board.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="text-body py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {sparks.length === 0
              ? "Every spark is already on this canvas."
              : "No sparks match that search."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((spark) => (
              <button
                key={spark.id}
                type="button"
                onClick={() => onAdd(spark.id)}
                className="flex items-center gap-3 rounded-xl p-2 text-left ring-1 ring-black/[.06] hover:ring-amber-300 dark:ring-white/[.1]"
              >
                {spark.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={spark.thumbnailUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50/60 dark:bg-amber-950/20">
                    <span className="font-serif text-xs italic text-amber-700 dark:text-amber-400">
                      Aa
                    </span>
                  </div>
                )}
                <p className="text-body flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {spark.title}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBoard && filtered.length > 0 ? (
        <div className="flex justify-end border-t border-black/[.06] px-4 py-3 dark:border-white/[.08]">
          <button
            type="button"
            onClick={() => onAddMany(filtered.map((spark) => spark.id))}
            className="text-body rounded-full border border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100/60 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
          >
            Add all {filtered.length}
          </button>
        </div>
      ) : null}
    </div>
  );
}
