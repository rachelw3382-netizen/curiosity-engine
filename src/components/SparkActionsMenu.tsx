"use client";

import { useEffect, useRef, useState } from "react";

export function SparkActionsMenu({
  onEdit,
  onDelete,
  disabled,
  alwaysVisible = false,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  /** Show the trigger without needing a hover/group state (e.g. on a full-page detail view). */
  alwaysVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Delete is confirmed inline, in this same popover, instead of a native window.confirm() —
  // blocking browser dialogs don't reliably receive input in every embedded/preview context.
  const [confirming, setConfirming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setConfirming(false);
        }}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm leading-none text-zinc-700 shadow ring-1 ring-black/[.06] transition-opacity hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-200 ${
          alwaysVisible ? "" : "opacity-0 group-hover:opacity-100"
        } ${open ? "opacity-100" : ""}`}
      >
        ⋯
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-8 z-10 flex w-44 flex-col overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/[.08] dark:bg-zinc-900 dark:ring-white/[.1]"
        >
          {confirming ? (
            <div className="flex flex-col gap-1.5 px-3 py-2">
              <p className="text-body text-xs text-zinc-600 dark:text-zinc-400">Delete this spark?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-black/[.08] px-2.5 py-1 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    setConfirming(false);
                    onDelete();
                  }}
                  className="rounded-full bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-900/[.04] dark:text-zinc-200 dark:hover:bg-white/[.06]"
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => setConfirming(true)}
                className="px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
