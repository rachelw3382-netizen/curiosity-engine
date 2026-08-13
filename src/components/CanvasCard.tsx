"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteCanvas, renameCanvas } from "@/lib/canvas-actions";

const cardShell =
  "flex h-40 flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]";

export function CanvasCard({
  id,
  name,
  nodeCount,
  edgeCount,
}: {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  function commitRename() {
    const trimmed = value.trim();
    setIsEditing(false);
    if (!trimmed || trimmed === name) {
      setValue(name);
      return;
    }
    startTransition(async () => {
      await renameCanvas(id, trimmed);
    });
  }

  function handleDelete() {
    setMenuOpen(false);
    if (
      !confirm(
        `Delete "${name}"? This removes the whole mindmap and everything on it. Sparks in your library aren't affected.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteCanvas(id);
    });
  }

  if (isEditing) {
    return (
      <div className={`${cardShell} justify-center gap-3`}>
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") {
              setValue(name);
              setIsEditing(false);
            }
          }}
          className="text-heading rounded-lg border border-amber-400 bg-transparent px-2 py-1 text-base font-semibold text-zinc-900 outline-none dark:text-zinc-50"
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link href={`/mindmap/${id}`} className={`${cardShell} ${isPending ? "opacity-50" : ""}`}>
        <h3 className="text-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {name}
        </h3>
        <p className="text-caption text-xs text-zinc-500 dark:text-zinc-400">
          {nodeCount} thought{nodeCount === 1 ? "" : "s"} · {edgeCount} connection
          {edgeCount === 1 ? "" : "s"}
        </p>
      </Link>

      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Manage mindmap ${name}`}
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm text-zinc-700 shadow ring-1 ring-black/[.06] opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-900/90 dark:text-zinc-200 ${
            menuOpen ? "opacity-100" : ""
          }`}
        >
          ⋯
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-8 z-10 flex w-32 flex-col overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/[.08] dark:bg-zinc-900 dark:ring-white/[.1]"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setIsEditing(true);
              }}
              className="px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-900/[.04] dark:text-zinc-200 dark:hover:bg-white/[.06]"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
