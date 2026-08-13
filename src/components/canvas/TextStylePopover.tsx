"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Palette } from "lucide-react";
import { ColorSwatchRow } from "@/components/canvas/ColorSwatchRow";
import {
  BACKGROUNDS,
  FONT_FAMILIES,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  FONT_SIZE_STEP,
  TEXT_COLORS,
  clampFontSize,
  type FontFamilyKey,
} from "@/components/canvas/text-style-options";

export type TextNodeStyleValues = {
  fontSize: number;
  fontFamily: FontFamilyKey;
  textColor: string;
  backgroundColor: string;
};

export function TextStylePopover({
  style,
  onChange,
}: {
  style: TextNodeStyleValues;
  onChange: (patch: Partial<TextNodeStyleValues>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sizeText, setSizeText] = useState(String(style.fontSize));
  const [syncedFontSize, setSyncedFontSize] = useState(style.fontSize);
  const containerRef = useRef<HTMLDivElement>(null);

  if (style.fontSize !== syncedFontSize) {
    setSyncedFontSize(style.fontSize);
    setSizeText(String(style.fontSize));
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function setFontSize(size: number) {
    onChange({ fontSize: clampFontSize(size) });
  }

  function commitSizeText() {
    const parsed = Number(sizeText);
    if (sizeText.trim() !== "" && !Number.isNaN(parsed)) {
      setFontSize(parsed);
    } else {
      setSizeText(String(style.fontSize));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Text style"
        className="nodrag flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-600 shadow ring-1 ring-black/[.08] hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/[.1]"
      >
        <Palette className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div className="nodrag nopan absolute left-full top-0 z-20 ml-2 flex w-64 flex-col gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/[.08] dark:bg-zinc-900 dark:ring-white/[.1]">
          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-[0.65rem] uppercase text-zinc-400">Size</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFontSize(style.fontSize - FONT_SIZE_STEP)}
                aria-label="Decrease font size"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[.08] text-zinc-600 hover:bg-zinc-900/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                value={sizeText}
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                onChange={(event) => setSizeText(event.target.value)}
                onBlur={commitSizeText}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                className="h-7 w-14 rounded-lg border border-black/[.08] bg-transparent px-2 text-center text-xs outline-none focus:border-amber-400 dark:border-white/[.145]"
              />
              <span className="text-caption text-xs text-zinc-400">px</span>
              <button
                type="button"
                onClick={() => setFontSize(style.fontSize + FONT_SIZE_STEP)}
                aria-label="Increase font size"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[.08] text-zinc-600 hover:bg-zinc-900/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-[0.65rem] uppercase text-zinc-400">Font</span>
            <div className="flex gap-1">
              {FONT_FAMILIES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onChange({ fontFamily: option.key })}
                  className={`flex-1 rounded-lg border py-1 text-xs ${option.fontClass} ${
                    style.fontFamily === option.key
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <ColorSwatchRow
            label="Text color"
            options={TEXT_COLORS}
            value={style.textColor}
            onSelect={(textColor) => onChange({ textColor })}
          />

          <ColorSwatchRow
            label="Background"
            options={BACKGROUNDS}
            value={style.backgroundColor}
            onSelect={(backgroundColor) => onChange({ backgroundColor })}
          />
        </div>
      ) : null}
    </div>
  );
}
