"use client";

import { useState, useTransition } from "react";
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
import { updateNodeDetailLevel, updateNodeSize } from "@/lib/canvas-actions";
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
  const [, startTransition] = useTransition();
  const { spark } = data;
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(data.detailLevel);
  const [manuallyResized, setManuallyResized] = useState(data.hasCustomWidth ?? false);
  const isManualWidth = manuallyResized && width != null;
  const isExpanded = detailLevel === "detailed";

  function toggleDetail() {
    const next: DetailLevel = detailLevel === "compact" ? "detailed" : "compact";
    setDetailLevel(next);
    // The card's real height changes with the content; React Flow only auto-remeasures
    // via its own ResizeObserver timing, which can lag or stay stale after a prior
    // horizontal-only resize — force a fresh measurement so handles/resize dot stay glued.
    requestAnimationFrame(() => updateNodeInternals(id));
    startTransition(async () => {
      await updateNodeDetailLevel(id, next);
    });
  }

  function handleResizeEnd(_event: ResizeDragEvent, params: { width: number; height: number }) {
    data.onWidthChange?.(id, params.width);
    requestAnimationFrame(() => updateNodeInternals(id));
    startTransition(async () => {
      await updateNodeSize(id, params.width, params.height);
    });
  }

  return (
    <div className="relative">
      {selected ? (
        <NodeResizeControl
          position="bottom-right"
          minWidth={MIN_NODE_WIDTH}
          resizeDirection="horizontal"
          onResizeStart={() => setManuallyResized(true)}
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
