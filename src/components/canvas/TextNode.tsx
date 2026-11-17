"use client";

import { useEffect, useRef } from "react";
import {
  Handle,
  NodeResizeControl,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useCanvasEdit } from "@/components/canvas/canvas-edit";
import {
  TextStylePopover,
  type TextNodeStyleValues,
} from "@/components/canvas/TextStylePopover";
import {
  lookupFontFamily,
  resolveBackgroundStyle,
  resolveTextColorStyle,
} from "@/components/canvas/text-style-options";

export type TextNodeData = { text: string } & TextNodeStyleValues;
export type TextFlowNode = Node<TextNodeData, "text">;

const handles = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const MIN_NODE_WIDTH = 160;
const MIN_NODE_HEIGHT = 80;

export function TextNode({ id, data, selected, width, height }: NodeProps<TextFlowNode>) {
  const { deleteElements } = useReactFlow();
  const { checkpoint, patchNodeData } = useCanvasEdit();
  const style: TextNodeStyleValues = {
    fontSize: data.fontSize,
    fontFamily: data.fontFamily,
    textColor: data.textColor,
    backgroundColor: data.backgroundColor,
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isManualSize = width != null && height != null;

  function resizeToFitContent() {
    const el = textareaRef.current;
    if (!el || isManualSize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  // Re-fit whenever the text or font changes — including when undo/redo changes them.
  useEffect(() => {
    resizeToFitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualSize, data.text, data.fontSize, data.fontFamily]);

  function handleStyleChange(patch: Partial<TextNodeStyleValues>) {
    checkpoint();
    patchNodeData(id, patch);
  }

  function handleResizeStart() {
    checkpoint();
  }

  const fontClass = lookupFontFamily(style.fontFamily).fontClass;
  const textColorResolved = resolveTextColorStyle(style.textColor);
  const backgroundResolved = resolveBackgroundStyle(style.backgroundColor);

  return (
    <div
      className={`relative rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.16)] ring-1 ${
        backgroundResolved.className ?? "ring-black/[.08] dark:ring-white/[.1]"
      } ${isManualSize ? "h-full w-full" : "w-52"}`}
      style={backgroundResolved.style}
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

      {selected ? (
        <NodeResizeControl
          position="bottom-right"
          minWidth={MIN_NODE_WIDTH}
          minHeight={MIN_NODE_HEIGHT}
          onResizeStart={handleResizeStart}
        >
          <div className="nodrag h-3 w-3 rounded-sm border-2 border-white bg-amber-400 shadow dark:border-zinc-900" />
        </NodeResizeControl>
      ) : null}

      <div
        className={`absolute -top-9 right-0 flex gap-1 transition-opacity ${
          selected ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <TextStylePopover style={style} onChange={handleStyleChange} />
        <button
          type="button"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="nodrag flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-600 shadow ring-1 ring-black/[.08] hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/[.1]"
          aria-label="Delete text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={data.text}
        onChange={(event) => {
          // One undo step per burst of typing (steps merge until you pause for a second).
          checkpoint(`text:${id}`, 1000);
          patchNodeData(id, { text: event.target.value });
        }}
        placeholder="Type a thought…"
        rows={4}
        style={{ fontSize: style.fontSize, ...textColorResolved.style }}
        className={`nodrag nopan w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-zinc-400 ${
          isManualSize ? "h-full overflow-y-auto" : "overflow-hidden"
        } ${fontClass} ${textColorResolved.className ?? ""}`}
      />
    </div>
  );
}
