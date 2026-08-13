"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCollectionById, renameCollection } from "@/lib/actions";

export function BoardChip({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const router = useRouter();
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
      await renameCollection(id, trimmed);
    });
  }

  function handleDelete() {
    setMenuOpen(false);
    if (
      !confirm(
        `Delete "${name}"? Sparks in this board stay in your library — they just won't be organized into it anymore.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteCollectionById(id);
      if (active) router.push("/library");
    });
  }

  if (isEditing) {
    return (
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
        className="h-8 w-32 rounded-full border border-amber-400 bg-transparent px-3 text-sm outline-none"
      />
    );
  }

  return (
    <div ref={menuRef} className="group relative">
      <Link
        href={`/library?board=${id}`}
        className={`inline-flex items-center rounded-full px-3 py-1.5 pr-6 text-sm font-medium ${
          active
            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            : "border border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
        } ${isPending ? "opacity-50" : ""}`}
      >
        {name}
      </Link>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={`Manage board ${name}`}
        className={`absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 ${
          active ? "text-white/80 hover:text-white" : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        } ${menuOpen ? "opacity-100" : ""}`}
      >
        ⋯
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-9 z-10 flex w-32 flex-col overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/[.08] dark:bg-zinc-900 dark:ring-white/[.1]"
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
  );
}
