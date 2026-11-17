"use client";

import { createContext, useContext } from "react";

/**
 * What a node component can ask the canvas to do. The canvas owns all node state so that
 * undo/redo and autosave have one source of truth; nodes never keep editable state locally.
 */
export interface CanvasEdit {
  /** Remember the current canvas as an undo step. Calls with the same `group` within `windowMs` collapse into one step (e.g. a burst of typing). */
  checkpoint: (group?: string, windowMs?: number) => void;
  /** Merge `patch` into a node's data. */
  patchNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
}

const noop: CanvasEdit = { checkpoint: () => {}, patchNodeData: () => {} };

export const CanvasEditContext = createContext<CanvasEdit>(noop);

export function useCanvasEdit() {
  return useContext(CanvasEditContext);
}
