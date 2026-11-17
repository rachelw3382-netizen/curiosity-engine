"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SaveState = "saved" | "saving" | "error";

type Save = (task: () => Promise<unknown>) => Promise<boolean>;

const SaveContext = createContext<Save>(async (task) => {
  await task();
  return true;
});

/**
 * Wraps every mindmap write so the header can show "Saving… / Saved / Couldn't save".
 * Writes run strictly one after another (so an older write can never land after a newer
 * one), failed writes are retried, and the browser warns before leaving mid-save.
 */
export function useSaveTracker() {
  const pending = useRef(0);
  const failed = useRef(0);
  const dirty = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [state, setState] = useState<SaveState>("saved");

  const refresh = useCallback(() => {
    setState(pending.current > 0 || dirty.current ? "saving" : failed.current > 0 ? "error" : "saved");
  }, []);

  const save = useCallback<Save>(
    (task) => {
      pending.current += 1;
      refresh();
      let ok = true;
      const run = async () => {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await task();
            failed.current = 0;
            return;
          } catch (err) {
            lastError = err;
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          }
        }
        console.error("Mindmap save failed", lastError);
        failed.current += 1;
        ok = false;
      };
      const result = queue.current.then(run).then(() => {
        pending.current -= 1;
        refresh();
        return ok;
      });
      queue.current = result.then(() => undefined);
      return result;
    },
    [refresh],
  );

  /** Marks that edits exist which haven't been handed to `save` yet (debounce window). */
  const setDirty = useCallback(
    (value: boolean) => {
      dirty.current = value;
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (pending.current > 0 || dirty.current || failed.current > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return useMemo(() => ({ state, save, setDirty }), [state, save, setDirty]);
}

export const SaveProvider = SaveContext.Provider;

export function useSave(): Save {
  return useContext(SaveContext);
}

export function SaveIndicator({ state }: { state: SaveState }) {
  const label =
    state === "saving" ? "Saving…" : state === "error" ? "Couldn't save — retrying" : "All changes saved";
  return (
    <span
      role="status"
      className={`ml-auto text-xs ${
        state === "error" ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"
      }`}
    >
      {label}
    </span>
  );
}
