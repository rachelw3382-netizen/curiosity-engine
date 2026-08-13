"use client";

import { useActionState, useState } from "react";
import { createCollection, type ActionResult } from "@/lib/actions";

const initialState: ActionResult = { error: null };

export function CreateCollectionInline() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createCollection, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-dashed border-black/[.15] px-3 py-1.5 text-sm text-zinc-500 hover:border-black/[.3] hover:text-zinc-800 dark:border-white/[.2] dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        + New board
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <input
        type="text"
        name="name"
        autoFocus
        required
        placeholder="Board name"
        className="text-body h-8 w-36 rounded-full border border-black/[.08] bg-transparent px-3 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
      />
      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Add
      </button>
      {state.error ? (
        <span className="text-body text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
