"use client";

import { Fragment, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { BoardPicker } from "@/components/BoardPicker";
import {
  createSpark,
  createSparksBulk,
  type ActionResult,
  type BulkImportResult,
} from "@/lib/actions";

const initialState: ActionResult = { error: null };
const initialBulkState: BulkImportResult = { created: 0, failed: [] };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={pending ? undefined : { scale: 1.02 }}
      whileTap={pending ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
    >
      {pending ? pendingLabel : label}
    </motion.button>
  );
}

const categories = ["post", "import"] as const;
type Category = (typeof categories)[number];
const categoryLabel: Record<Category, string> = {
  post: "Post",
  import: "Import",
};

const importModes = ["url", "bulk", "embed"] as const;
type ImportMode = (typeof importModes)[number];
const importModeLabel: Record<ImportMode, string> = {
  url: "Link / video",
  bulk: "Bulk import",
  embed: "Embed code",
};

function tabClass(active: boolean) {
  return `flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
      : "text-zinc-500 dark:text-zinc-400"
  }`;
}

export function CaptureForm({
  collections,
}: {
  collections: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("post");
  const [importMode, setImportMode] = useState<ImportMode>("url");
  const activeMode: "note" | ImportMode = category === "post" ? "note" : importMode;

  const [url, setUrl] = useState("");
  const [manualThumbnailUrl, setManualThumbnailUrl] = useState("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [instagramMode, setInstagramMode] = useState<"embed" | "screenshot">("embed");
  const [instagramEmbedHtml, setInstagramEmbedHtml] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [state, formAction, isPending] = useActionState(createSpark, initialState);
  const [bulkState, bulkFormAction, isBulkPending] = useActionState(
    createSparksBulk,
    initialBulkState,
  );
  const isInstagram = /instagram\.com/i.test(url);
  const embedLooksValid = !embedCode || /<iframe[\s>]/i.test(embedCode);

  const formRef = useRef<HTMLFormElement>(null);
  const wasPendingRef = useRef(false);
  const bulkFormRef = useRef<HTMLFormElement>(null);
  const wasBulkPendingRef = useRef(false);

  // Clear the form after a successful save so it's ready for the next spark.
  useEffect(() => {
    if (wasPendingRef.current && !isPending && !state.error) {
      formRef.current?.reset();
      setUrl("");
      setManualThumbnailUrl("");
      setInstagramEmbedHtml("");
      setEmbedCode("");
    }
    wasPendingRef.current = isPending;
  }, [isPending, state]);

  useEffect(() => {
    if (wasBulkPendingRef.current && !isBulkPending && bulkState.created > 0) {
      bulkFormRef.current?.reset();
    }
    wasBulkPendingRef.current = isBulkPending;
  }, [isBulkPending, bulkState]);

  async function handleThumbnailUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string };
      if (data.url) setManualThumbnailUrl(data.url);
    } finally {
      setIsUploadingThumbnail(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="inline-flex h-10 w-fit items-center justify-center gap-1.5 rounded-full border border-black/[.08] px-4 text-sm font-medium text-zinc-800 dark:border-white/[.145] dark:text-zinc-200"
      >
        <span className="text-base leading-none">{open ? "×" : "+"}</span>
        {open ? "Close" : "Add a spark"}
      </motion.button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="capture-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]">
              <div className="flex flex-col gap-2">
                <div className="flex gap-1 rounded-full bg-zinc-900/[.04] p-1 dark:bg-white/[.06]">
                  {categories.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCategory(option)}
                      className={tabClass(category === option)}
                    >
                      {categoryLabel[option]}
                    </button>
                  ))}
                </div>

                {category === "import" ? (
                  <div className="flex gap-1 rounded-full bg-zinc-900/[.04] p-1 dark:bg-white/[.06]">
                    {importModes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setImportMode(option)}
                        className={tabClass(importMode === option)}
                      >
                        {importModeLabel[option]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {activeMode === "bulk" ? (
                <form ref={bulkFormRef} action={bulkFormAction} className="flex flex-col gap-4">
                  <textarea
                    name="urls"
                    required
                    rows={6}
                    placeholder={
                      "Paste multiple links, one per line —\nhttps://tiktok.com/...\nhttps://youtube.com/...\nhttps://instagram.com/..."
                    }
                    className="text-body resize-none rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                  />
                  <p className="text-body text-xs text-zinc-500 dark:text-zinc-400">
                    Each link becomes its own spark. TikTok and YouTube links get a real
                    preview; Instagram links save with a placeholder title you can edit
                    afterward — Instagram doesn&apos;t allow apps to auto-preview links.
                  </p>

                  <BoardPicker collections={collections} />

                  {bulkState.created > 0 || bulkState.failed.length > 0 ? (
                    <div className="text-body flex flex-col gap-1 text-sm">
                      {bulkState.created > 0 ? (
                        <p className="text-green-700 dark:text-green-400">
                          Saved {bulkState.created} spark{bulkState.created === 1 ? "" : "s"}.
                        </p>
                      ) : null}
                      {bulkState.failed.length > 0 ? (
                        <ul className="list-disc pl-4 text-red-600 dark:text-red-400">
                          {bulkState.failed.map((f) => (
                            <li key={f.url}>
                              {f.url} — {f.reason}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <SubmitButton label="Import links" pendingLabel="Importing…" />
                  </div>
                </form>
              ) : (
                <form
                  ref={formRef}
                  action={(formData) => {
                    formData.set("type", activeMode);
                    formAction(formData);
                  }}
                  className="flex flex-col gap-4"
                >
                  {activeMode === "note" ? (
                    <Fragment key="post-fields">
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="Your thought, in a line"
                        className="text-body rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />
                      <textarea
                        name="description"
                        rows={5}
                        placeholder="Write more"
                        className="text-body resize-none rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />

                      <input type="hidden" name="manualThumbnailUrl" value={manualThumbnailUrl} />
                      {manualThumbnailUrl ? (
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={manualThumbnailUrl}
                            alt=""
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setManualThumbnailUrl("")}
                            className="text-body text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
                          >
                            Remove photo
                          </button>
                        </div>
                      ) : (
                        <label className="text-body w-fit cursor-pointer rounded-full border border-black/[.08] px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-900/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]">
                          {isUploadingThumbnail ? "Uploading…" : "Add a photo"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleThumbnailUpload}
                            disabled={isUploadingThumbnail}
                            className="hidden"
                          />
                        </label>
                      )}
                    </Fragment>
                  ) : activeMode === "url" ? (
                    <Fragment key="url-fields">
                      <input
                        type="url"
                        name="url"
                        required
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="Paste a link — YouTube, TikTok, an article…"
                        className="text-body rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />

                      {isInstagram ? (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                          <p className="text-body text-xs text-zinc-600 dark:text-zinc-400">
                            Instagram doesn&apos;t allow apps to auto-preview links.
                          </p>

                          <div className="flex gap-1 rounded-full bg-white p-1 dark:bg-zinc-900">
                            {(["embed", "screenshot"] as const).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setInstagramMode(option)}
                                className={`flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                                  instagramMode === option
                                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
                                    : "text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                {option === "embed" ? "Embed code" : "Screenshot"}
                              </button>
                            ))}
                          </div>

                          {instagramMode === "embed" ? (
                            <>
                              <p className="text-body text-xs text-zinc-600 dark:text-zinc-400">
                                On the post: &ldquo;⋯&rdquo; → Embed → copy the code and paste
                                it below for a real preview.
                              </p>
                              <textarea
                                name="instagramEmbedHtml"
                                rows={4}
                                value={instagramEmbedHtml}
                                onChange={(event) => setInstagramEmbedHtml(event.target.value)}
                                placeholder='<blockquote class="instagram-media" ...'
                                className="resize-none rounded-xl border border-black/[.08] bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-amber-400 dark:border-white/[.145]"
                              />
                              {instagramEmbedHtml &&
                              !instagramEmbedHtml.includes("data-instgrm-permalink") ? (
                                <p className="text-body text-xs text-red-600 dark:text-red-400">
                                  That doesn&apos;t look like an Instagram embed snippet —
                                  make sure you copied the whole thing.
                                </p>
                              ) : null}
                            </>
                          ) : null}

                          <input
                            type="text"
                            name="manualTitle"
                            required
                            placeholder="Title for this reel/post"
                            className="text-body rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                          />

                          {instagramMode === "screenshot" ? (
                            <>
                              <input
                                type="hidden"
                                name="manualThumbnailUrl"
                                value={manualThumbnailUrl}
                              />
                              {manualThumbnailUrl ? (
                                <div className="flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={manualThumbnailUrl}
                                    alt=""
                                    className="h-14 w-14 rounded-lg object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setManualThumbnailUrl("")}
                                    className="text-body text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
                                  >
                                    Remove photo
                                  </button>
                                </div>
                              ) : (
                                <label className="text-body w-fit cursor-pointer rounded-full border border-black/[.08] px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-900/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]">
                                  {isUploadingThumbnail ? "Uploading…" : "Add a screenshot"}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleThumbnailUpload}
                                    disabled={isUploadingThumbnail}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      <textarea
                        name="whySaved"
                        rows={4}
                        placeholder="Write more"
                        className="text-body resize-none rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />
                    </Fragment>
                  ) : (
                    <Fragment key="embed-fields">
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="Title — e.g. the song or video name"
                        className="text-body rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />
                      <div className="flex flex-col gap-1">
                        <p className="text-body text-xs text-zinc-600 dark:text-zinc-400">
                          Paste an embed snippet — Spotify, YouTube, SoundCloud, etc. all have a
                          &ldquo;Share → Embed&rdquo; option that gives you one.
                        </p>
                        <textarea
                          name="embedHtml"
                          required
                          rows={4}
                          value={embedCode}
                          onChange={(event) => setEmbedCode(event.target.value)}
                          placeholder='<iframe src="https://open.spotify.com/embed/..." ...></iframe>'
                          className="resize-none rounded-xl border border-black/[.08] bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-amber-400 dark:border-white/[.145]"
                        />
                        {!embedLooksValid ? (
                          <p className="text-body text-xs text-red-600 dark:text-red-400">
                            That doesn&apos;t look like an embed snippet — make sure you copied
                            the whole iframe code.
                          </p>
                        ) : null}
                      </div>
                      <input
                        type="url"
                        name="url"
                        required
                        placeholder="Link to the original video/post"
                        className="text-body rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />
                      <textarea
                        name="whySaved"
                        rows={3}
                        placeholder="Write more"
                        className="text-body resize-none rounded-xl border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/[.145]"
                      />
                    </Fragment>
                  )}

                  <BoardPicker collections={collections} />

                  {state.error ? (
                    <p className="text-body text-sm text-red-600 dark:text-red-400">
                      {state.error}
                    </p>
                  ) : null}

                  <div>
                    <SubmitButton label="Save spark" pendingLabel="Saving…" />
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
