"use client";

import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";

export type ImageNodeData = { imageUrl: string };
export type ImageFlowNode = Node<ImageNodeData, "image">;

const handles = [Position.Top, Position.Right, Position.Bottom, Position.Left];

export function ImageNode({ id, data, selected }: NodeProps<ImageFlowNode>) {
  const { deleteElements } = useReactFlow();

  return (
    <div
      className={`relative w-56 overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.16)] ring-1 transition-shadow dark:bg-zinc-900 ${
        selected ? "ring-2 ring-amber-400" : "ring-1 ring-black/[.06] dark:ring-white/[.1]"
      }`}
    >
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

      <button
        type="button"
        onClick={() => deleteElements({ nodes: [{ id }] })}
        className={`nodrag absolute -top-9 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-600 shadow ring-1 ring-black/[.08] transition-opacity hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/[.1] ${
          selected ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Remove from canvas"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.imageUrl} alt="" className="h-auto w-full" />
    </div>
  );
}
