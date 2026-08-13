"use client";

import { useState, useTransition } from "react";
import { createCanvas } from "@/lib/canvas-actions";

export function CreateCanvasInline() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-40 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-black/[.15] text-sm text-zinc-500 hover:border-black/[.3] hover:text-zinc-800 dark:border-white/[.2] dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <span className="text-2xl leading-none">+</span>
        New mindmap
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        const name = String(formData.get("name") ?? "");
        startTransition(async () => {
          await createCanvas(name);
        });
      }}
      className="flex h-40 flex-col justify-center gap-3 rounded-2xl border border-amber-400 p-4"
    >
      <input
        type="text"
        name="name"
        autoFocus
        required
        placeholder="Mindmap name"
        disabled={isPending}
        className="text-body rounded-lg border border-black/[.08] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isPending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
