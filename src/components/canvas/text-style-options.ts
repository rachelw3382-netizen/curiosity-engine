export type FontFamilyKey = "sans" | "serif" | "mono";

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 48;
export const DEFAULT_FONT_SIZE = 14;
export const FONT_SIZE_STEP = 2;

export function clampFontSize(size: number) {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));
}

export const FONT_FAMILIES: { key: FontFamilyKey; label: string; fontClass: string }[] = [
  { key: "sans", label: "Sans", fontClass: "font-sans" },
  { key: "serif", label: "Serif", fontClass: "font-serif italic" },
  { key: "mono", label: "Mono", fontClass: "font-mono" },
];

/**
 * Text/background colors are stored as either one of these preset keys, or a raw
 * "#rrggbb" hex string written by the color-wheel / eyedropper. `isCustomColor`
 * tells the two apart; presets render via Tailwind class, hex via inline style.
 */
export const TEXT_COLORS: { key: string; label: string; textClass: string; swatchClass: string }[] = [
  { key: "ink", label: "Ink", textClass: "text-zinc-800 dark:text-zinc-100", swatchClass: "bg-zinc-700" },
  { key: "red", label: "Red", textClass: "text-red-700 dark:text-red-300", swatchClass: "bg-red-600" },
  { key: "orange", label: "Orange", textClass: "text-orange-700 dark:text-orange-300", swatchClass: "bg-orange-500" },
  { key: "amber", label: "Amber", textClass: "text-amber-800 dark:text-amber-300", swatchClass: "bg-amber-600" },
  { key: "green", label: "Green", textClass: "text-green-700 dark:text-green-300", swatchClass: "bg-green-600" },
  { key: "teal", label: "Teal", textClass: "text-teal-700 dark:text-teal-300", swatchClass: "bg-teal-600" },
  { key: "blue", label: "Blue", textClass: "text-blue-700 dark:text-blue-300", swatchClass: "bg-blue-600" },
  { key: "purple", label: "Purple", textClass: "text-purple-700 dark:text-purple-300", swatchClass: "bg-purple-600" },
  { key: "pink", label: "Pink", textClass: "text-pink-700 dark:text-pink-300", swatchClass: "bg-pink-600" },
];

export const BACKGROUNDS: {
  key: string;
  label: string;
  bgClass: string;
  ringClass: string;
  swatchClass: string;
}[] = [
  {
    key: "plain",
    label: "Plain",
    bgClass: "bg-white/90 dark:bg-zinc-900/90",
    ringClass: "ring-black/[.08] dark:ring-white/[.1]",
    swatchClass: "bg-white ring-1 ring-black/10",
  },
  {
    key: "red",
    label: "Red",
    bgClass: "bg-red-50/80 dark:bg-red-950/30",
    ringClass: "ring-red-200/70 dark:ring-red-900",
    swatchClass: "bg-red-200",
  },
  {
    key: "orange",
    label: "Orange",
    bgClass: "bg-orange-50/80 dark:bg-orange-950/30",
    ringClass: "ring-orange-200/70 dark:ring-orange-900",
    swatchClass: "bg-orange-200",
  },
  {
    key: "amber",
    label: "Amber",
    bgClass: "bg-amber-50/80 dark:bg-amber-950/30",
    ringClass: "ring-amber-200/70 dark:ring-amber-900",
    swatchClass: "bg-amber-200",
  },
  {
    key: "green",
    label: "Green",
    bgClass: "bg-green-50/80 dark:bg-green-950/30",
    ringClass: "ring-green-200/70 dark:ring-green-900",
    swatchClass: "bg-green-200",
  },
  {
    key: "teal",
    label: "Teal",
    bgClass: "bg-teal-50/80 dark:bg-teal-950/30",
    ringClass: "ring-teal-200/70 dark:ring-teal-900",
    swatchClass: "bg-teal-200",
  },
  {
    key: "blue",
    label: "Blue",
    bgClass: "bg-blue-50/80 dark:bg-blue-950/30",
    ringClass: "ring-blue-200/70 dark:ring-blue-900",
    swatchClass: "bg-blue-200",
  },
  {
    key: "purple",
    label: "Purple",
    bgClass: "bg-purple-50/80 dark:bg-purple-950/30",
    ringClass: "ring-purple-200/70 dark:ring-purple-900",
    swatchClass: "bg-purple-200",
  },
  {
    key: "pink",
    label: "Pink",
    bgClass: "bg-pink-50/80 dark:bg-pink-950/30",
    ringClass: "ring-pink-200/70 dark:ring-pink-900",
    swatchClass: "bg-pink-200",
  },
];

export function lookupFontFamily(key: string) {
  return FONT_FAMILIES.find((o) => o.key === key) ?? FONT_FAMILIES[0];
}

export function isCustomColor(value: string) {
  return value.startsWith("#");
}

export function resolveTextColorStyle(value: string): {
  className?: string;
  style?: { color: string };
} {
  if (isCustomColor(value)) return { style: { color: value } };
  const preset = TEXT_COLORS.find((o) => o.key === value) ?? TEXT_COLORS[0];
  return { className: preset.textClass };
}

export function resolveBackgroundStyle(value: string): {
  className?: string;
  style?: { backgroundColor: string };
} {
  if (isCustomColor(value)) return { style: { backgroundColor: value } };
  const preset = BACKGROUNDS.find((o) => o.key === value) ?? BACKGROUNDS[0];
  return { className: `${preset.bgClass} ${preset.ringClass}` };
}
