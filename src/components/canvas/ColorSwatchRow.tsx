"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Pipette } from "lucide-react";
import { isCustomColor } from "@/components/canvas/text-style-options";

// The EyeDropper API is experimental (Chrome/Edge only) and has no built-in TS types.
interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperInstance {
  open: () => Promise<EyeDropperResult>;
}
declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperInstance;
  }
}

const noopSubscribe = () => () => {};

export function ColorSwatchRow({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { key: string; label: string; swatchClass: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const wheelInputId = useId();
  const [isPicking, setIsPicking] = useState(false);
  const hasEyeDropper = useSyncExternalStore(
    noopSubscribe,
    () => "EyeDropper" in window,
    () => false,
  );

  async function handleEyeDropper() {
    if (!window.EyeDropper) return;
    setIsPicking(true);
    try {
      const result = await new window.EyeDropper().open();
      onSelect(result.sRGBHex);
    } catch {
      // user cancelled (Escape) — no-op
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-[0.65rem] uppercase text-zinc-400">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            aria-label={option.label}
            className={`h-6 w-6 shrink-0 rounded-full ${option.swatchClass} ${
              value === option.key ? "ring-2 ring-offset-2 ring-zinc-800 dark:ring-offset-zinc-900" : ""
            }`}
          />
        ))}

        <label
          htmlFor={wheelInputId}
          aria-label="Choose any color"
          className={`h-6 w-6 shrink-0 cursor-pointer rounded-full ${
            isCustomColor(value) ? "ring-2 ring-offset-2 ring-zinc-800 dark:ring-offset-zinc-900" : ""
          }`}
          style={{
            background:
              "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
          }}
        >
          <input
            id={wheelInputId}
            type="color"
            value={isCustomColor(value) ? value : "#808080"}
            onChange={(event) => onSelect(event.target.value)}
            className="h-0 w-0 opacity-0"
          />
        </label>

        {hasEyeDropper ? (
          <button
            type="button"
            onClick={handleEyeDropper}
            disabled={isPicking}
            aria-label="Pick a color from your screen"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/[.1] text-zinc-500 hover:bg-zinc-900/[.04] disabled:opacity-50 dark:border-white/[.15] dark:text-zinc-400 dark:hover:bg-white/[.06]"
          >
            <Pipette className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
