"use client";

import { useRef, useState } from "react";
import { CanvasModalShell } from "@/components/canvas/CanvasModalShell";

const tabs = ["upload", "url"] as const;
type Tab = (typeof tabs)[number];
const tabLabel: Record<Tab, string> = { upload: "Upload", url: "Paste a link" };

export function AddPictureModal({
  onAdd,
  onClose,
}: {
  onAdd: (imageUrl: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("upload");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      onAdd(data.url);
      onClose();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleUrlSubmit() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste an image link first.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Only http and https links are supported.");
      return;
    }
    onAdd(trimmed);
    onClose();
  }

  return (
    <CanvasModalShell title="Add a picture" onClose={onClose}>
      <div className="mb-4 flex gap-1 rounded-full bg-zinc-900/[.04] p-1 dark:bg-white/[.06]">
        {tabs.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setTab(option);
              setError(null);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === option
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {tabLabel[option]}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-xl border border-dashed border-black/[.15] px-4 py-8 text-center text-sm text-zinc-500 hover:border-black/[.3] hover:text-zinc-800 disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {isUploading ? "Uploading…" : "Click to choose a photo (JPEG, PNG, GIF, or WEBP)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            className="text-body rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="w-fit rounded-full bg-zinc-900 px-4 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Add picture
          </button>
        </div>
      )}

      {error ? (
        <p className="text-body mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </CanvasModalShell>
  );
}
