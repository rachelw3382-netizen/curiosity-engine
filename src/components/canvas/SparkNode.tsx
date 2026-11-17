"use client";

import { useRouter } from "next/navigation";
import {
  Handle,
  NodeResizeControl,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
  type ResizeDragEvent,
} from "@xyflow/react";
import { ArrowUpRight, ChevronDown, ChevronUp, X } from "lucide-react";
import { MasonryCard } from "@/components/MasonryCard";
import { useRef } from "react";
import { useCanvasEdit } from "@/components/canvas/canvas-edit";
import type { Spark } from "@/generated/prisma/client";

type DetailLevel = "compact" | "detailed";

export type SparkNodeData = {
  spark: Spark;
  detailLevel: DetailLevel;
  hasCustomWidth?: boolean;
  onWidthChange?: (id: string, width: number | null) => void;
};
export type SparkFlowNode = Node<SparkNodeData, "spark">;

const handles = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const MIN_NODE_WIDTH = 100;

const iconButtonClass =
  "nodrag flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-600 shadow ring-1 ring-black/[.08] hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/[.1]";

export function SparkNode({ id, data, selected, width }: NodeProps<SparkFlowNode>) {
  const router = useRouter();
  const { deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const { checkpoint, patchNodeData } = useCanvasEdit();
  const { spark } = data;
  // First click selects; clicking the already-selected card opens it. We remember whether the
  // card was selected (and where the pointer went down) *before* React Flow handles the press.
  const press = useRef<{ wasSelected: boolean; x: number; y: number } | null>(null);
  const detailLevel = data.detailLevel;
  const isManualWidth = !!data.hasCustomWidth && width != null;
  const isExpanded = detailLevel === "detailed";

  function toggleDetail() {
    const next: DetailLevel = detailLevel === "compact" ? "detailed" : "compact";
    checkpoint();
    patchNodeData(id, { detailLevel: next });
    // The card's real height changes with the content; React Flow only auto-remeasures
    // via its own ResizeObserver timing, which can lag or stay stale after a prior
    // horizontal-only resize — force a fresh measurement so handles/resize dot stay glued.
    requestAnimationFrame(() => updateNodeInternals(id));
  }

  function handleResizeEnd(_event: ResizeDragEvent, params: { width: number }) {
    data.onWidthChange?.(id, params.width);
    requestAnimationFrame(() => updateNodeInternals(id));
  }

  return (
    <div
      className="relative"
      onPointerDownCapture={(event) => {
        press.current = { wasSelected: selected, x: event.clientX, y: event.clientY };
      }}
      onClick={(event) => {
        const start = press.current;
        press.current = null;
        if (!start?.wasSelected || !selected) return;
        // Ignore drags and clicks on the card's own buttons / handles / resize dot.
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return;
        if ((event.target as HTMLElement).closest("button, a, .react-flow__handle, .react-flow__resize-control")) return;
        if (event.shiftKey || event.metaKey || event.ctrlKey) return; // multi-select gestures
        router.push(`/spark/${spark.id}`);
      }}
    >
      {selected ? (
        <NodeResizeControl
          position="bottom-right"
          minWidth={MIN_NODE_WIDTH}
          resizeDirection="horizontal"
          onResizeStart={() => {
            checkpoint();
            patchNodeData(id, { hasCustomWidth: true });
          }}
          onResizeEnd={handleResizeEnd}
        >
          <div className="nodrag h-3 w-3 rounded-sm border-2 border-white bg-amber-400 shadow dark:border-zinc-900" />
        </NodeResizeControl>
      ) : null}

      {handles.map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          className={`!h-2 !w-2 !border-0 !bg-amber-400 transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      <div
        className={`absolute -top-9 right-0 flex gap-1 transition-opacity ${
          selected ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={toggleDetail}
          aria-label={detailLevel === "compact" ? "Show description" : "Hide description"}
          className={iconButtonClass}
        >
          {detailLevel === "compact" ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/spark/${spark.id}`)}
          aria-label="Open full page"
          className={iconButtonClass}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          aria-label="Remove from canvas"
          className={iconButtonClass}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={`rounded-2xl transition-shadow ${
          selected ? "ring-2 ring-amber-400" : ""
        } ${isManualWidth ? "" : "w-72"}`}
        style={isManualWidth ? { width } : undefined}
      >
        <MasonryCard spark={spark} showDescription={isExpanded} />
      </div>
    </div>
  );
}
