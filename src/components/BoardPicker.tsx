"use client";

import { useState } from "react";

export function BoardPicker({
  collections,
  defaultSelected = [],
}: {
  collections: { id: string; name: string }[];
  defaultSelected?: string[];
}) {
  const [addingBoard, setAddingBoard] = useState(false);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-caption text-xs uppercase text-zinc-500 dark:text-zinc-400">
        Boards
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        {collections.map((collection) => (
          <label
            key={collection.id}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1 text-sm text-zinc-700 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50 dark:border-white/[.145] dark:text-zinc-300 dark:has-[:checked]:bg-amber-950/30"
          >
            <input
              type="checkbox"
              name="collectionIds"
              value={collection.id}
              defaultChecked={defaultSelected.includes(collection.id)}
              className="sr-only"
            />
            {collection.name}
          </label>
        ))}

        {addingBoard ? (
          <input
            type="text"
            name="newBoardName"
            autoFocus
            placeholder="New board name"
            className="text-body h-8 w-40 rounded-full border border-amber-400 bg-transparent px-3 text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingBoard(true)}
            className="rounded-full border border-dashed border-black/[.15] px-3 py-1 text-sm text-zinc-500 hover:border-black/[.3] hover:text-zinc-800 dark:border-white/[.2] dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + New board
          </button>
        )}
      </div>
    </fieldset>
  );
}
