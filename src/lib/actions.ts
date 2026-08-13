"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchLinkMetadata, UnsafeUrlError } from "@/lib/link-metadata";
import { LOCAL_USER_ID } from "@/lib/constants";

export interface ActionResult {
  error: string | null;
}

/** Best-effort provider label for an embed spark, from the domain parsed out of its iframe src. */
function inferEmbedProvider(domain: string | null | undefined): "youtube" | "tiktok" | "vimeo" | "web" {
  if (!domain) return "web";
  if (domain.includes("youtube.com") || domain === "youtu.be") return "youtube";
  if (domain.includes("tiktok.com")) return "tiktok";
  if (domain.includes("vimeo.com")) return "vimeo";
  return "web";
}

/** Resolves the board ids a spark should belong to, creating a new board by name if asked. */
async function resolveBoardIds(
  collectionIds: string[],
  newBoardName?: string,
): Promise<string[]> {
  if (!newBoardName?.trim()) return collectionIds;
  const board = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: newBoardName.trim() },
  });
  return [...collectionIds, board.id];
}

export async function createSpark(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const typeRaw = formData.get("type");
  const type = typeRaw === "note" ? "note" : typeRaw === "embed" ? "embed" : "url";
  const newBoardName = String(formData.get("newBoardName") ?? "").trim() || undefined;
  const boardIds = await resolveBoardIds(
    formData.getAll("collectionIds").map(String),
    newBoardName,
  );

  if (type === "note") {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Write something before saving." };
    const description = String(formData.get("description") ?? "").trim() || undefined;
    const manualThumbnailUrl = String(formData.get("manualThumbnailUrl") ?? "").trim();

    await prisma.spark.create({
      data: {
        userId: LOCAL_USER_ID,
        type: "note",
        title,
        description,
        mediaType: manualThumbnailUrl ? "image" : "text",
        thumbnailUrl: manualThumbnailUrl || undefined,
        status: boardIds.length ? "collected" : "inbox",
        collections: { create: boardIds.map((collectionId) => ({ collectionId })) },
      },
    });
  } else if (type === "embed") {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Give this a title before saving." };
    const embedHtml = String(formData.get("embedHtml") ?? "").trim();
    if (!embedHtml) return { error: "Paste an embed code before saving." };
    const url = String(formData.get("url") ?? "").trim() || undefined;
    if (!url) return { error: "Add a link to the original video or post before saving." };
    const whySaved = String(formData.get("whySaved") ?? "").trim() || undefined;

    // Best-effort domain/provider — pulled from the embedded iframe's own src, not fetched.
    // Needed for "More like this" (src/lib/related-content.ts) to recognize e.g. a YouTube embed.
    let domain: string | undefined;
    const srcMatch = embedHtml.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      try {
        domain = new URL(srcMatch[1]).hostname.replace(/^www\./, "");
      } catch {
        domain = undefined;
      }
    }

    // Digits-only on purpose — a percentage width (e.g. Spotify's `width="100%"`)
    // is already responsive and shouldn't be forced into a fixed aspect ratio.
    const widthMatch = embedHtml.match(/\bwidth=["'](\d+)["']/i);
    const heightMatch = embedHtml.match(/\bheight=["'](\d+)["']/i);
    const embedWidth = widthMatch ? Number(widthMatch[1]) : undefined;
    const embedHeight = heightMatch ? Number(heightMatch[1]) : undefined;

    await prisma.spark.create({
      data: {
        userId: LOCAL_USER_ID,
        type: "embed",
        url,
        title,
        whySaved,
        mediaType: "embed",
        embedHtml,
        domain,
        provider: inferEmbedProvider(domain),
        width: embedWidth,
        height: embedHeight,
        status: boardIds.length ? "collected" : "inbox",
        collections: { create: boardIds.map((collectionId) => ({ collectionId })) },
      },
    });
  } else {
    const url = String(formData.get("url") ?? "").trim();
    if (!url) return { error: "Paste a link before saving." };
    const whySaved = String(formData.get("whySaved") ?? "").trim() || undefined;

    let metadata;
    try {
      metadata = await fetchLinkMetadata(url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) return { error: err.message };
      return { error: "Couldn't reach that link. Check the URL and try again." };
    }

    // Manual overrides for links that can't be auto-previewed (e.g. Instagram) —
    // only ever sent when the capture form itself decided auto-fetch wouldn't work.
    const manualTitle = String(formData.get("manualTitle") ?? "").trim();
    const manualThumbnailUrl = String(formData.get("manualThumbnailUrl") ?? "").trim();
    const instagramEmbedHtml = String(formData.get("instagramEmbedHtml") ?? "").trim();
    if (manualTitle) metadata.title = manualTitle;
    if (manualThumbnailUrl) {
      metadata.thumbnailUrl = manualThumbnailUrl;
      metadata.mediaType = "image";
    }
    if (
      instagramEmbedHtml.includes("instagram-media") &&
      instagramEmbedHtml.includes("data-instgrm-permalink")
    ) {
      metadata.embedHtml = instagramEmbedHtml;
    }

    await prisma.spark.create({
      data: {
        userId: LOCAL_USER_ID,
        type: "url",
        url,
        title: metadata.title,
        description: metadata.description,
        whySaved,
        mediaType: metadata.mediaType,
        provider: metadata.provider,
        thumbnailUrl: metadata.thumbnailUrl,
        embedHtml: metadata.embedHtml,
        domain: metadata.domain,
        width: metadata.width,
        height: metadata.height,
        status: boardIds.length ? "collected" : "inbox",
        collections: { create: boardIds.map((collectionId) => ({ collectionId })) },
      },
    });
  }

  revalidatePath("/library");
  return { error: null };
}

export interface BulkImportResult {
  created: number;
  failed: { url: string; reason: string }[];
}

const MAX_BULK_LINES = 50;

export async function createSparksBulk(
  _prev: BulkImportResult,
  formData: FormData,
): Promise<BulkImportResult> {
  const raw = String(formData.get("urls") ?? "");
  const newBoardName = String(formData.get("newBoardName") ?? "").trim() || undefined;
  const boardIds = await resolveBoardIds(
    formData.getAll("collectionIds").map(String),
    newBoardName,
  );

  const lines = Array.from(
    new Set(
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_BULK_LINES);

  const failed: BulkImportResult["failed"] = [];
  let created = 0;

  for (const url of lines) {
    try {
      const metadata = await fetchLinkMetadata(url);
      await prisma.spark.create({
        data: {
          userId: LOCAL_USER_ID,
          type: "url",
          url,
          title: metadata.title,
          description: metadata.description,
          mediaType: metadata.mediaType,
          provider: metadata.provider,
          thumbnailUrl: metadata.thumbnailUrl,
          embedHtml: metadata.embedHtml,
          domain: metadata.domain,
          width: metadata.width,
          height: metadata.height,
          status: boardIds.length ? "collected" : "inbox",
          collections: { create: boardIds.map((collectionId) => ({ collectionId })) },
        },
      });
      created += 1;
    } catch (err) {
      const reason =
        err instanceof UnsafeUrlError ? err.message : "Couldn't reach this link.";
      failed.push({ url, reason });
    }
  }

  if (created > 0) revalidatePath("/library");
  return { created, failed };
}

export async function createCollection(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the board a name." };

  await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name },
  });

  revalidatePath("/library");
  return { error: null };
}

export async function renameCollection(id: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Board name can't be empty." };
  await prisma.collection.update({ where: { id }, data: { name: trimmed } });
  revalidatePath("/library");
  return { error: null };
}

/** Deletes the board only — sparks in it stay in the library, just unfiled (cascade only removes the join rows). */
export async function deleteCollectionById(id: string): Promise<ActionResult> {
  await prisma.collection.delete({ where: { id } });
  revalidatePath("/library");
  return { error: null };
}

export interface UpdateSparkInput {
  id: string;
  title: string;
  description?: string;
  whySaved?: string;
  url?: string;
  collectionIds: string[];
  newBoardName?: string;
}

export async function updateSpark(input: UpdateSparkInput): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Title can't be empty." };

  const boardIds = await resolveBoardIds(input.collectionIds, input.newBoardName);

  // description/whySaved are only touched when the caller actually sends them — the
  // edit form sends just one or the other depending on spark type, and a save
  // shouldn't silently blank out the field it isn't editing.
  const sparkData: {
    title: string;
    status: string;
    description?: string | null;
    whySaved?: string | null;
    url?: string | null;
    provider?: string;
  } = {
    title,
    status: boardIds.length ? "collected" : "inbox",
  };
  if (input.description !== undefined) {
    sparkData.description = input.description.trim() || null;
  }
  if (input.whySaved !== undefined) {
    sparkData.whySaved = input.whySaved.trim() || null;
  }
  if (input.url !== undefined) {
    sparkData.url = input.url.trim() || null;
    // Embed sparks captured before the provider-detection fix are stuck at "web" even for a
    // YouTube iframe — re-derive it here from the domain already on file, so adding a URL
    // retroactively unlocks real "More like this" suggestions without re-pasting the embed.
    const existing = await prisma.spark.findUnique({ where: { id: input.id }, select: { type: true, domain: true } });
    if (existing?.type === "embed") {
      sparkData.provider = inferEmbedProvider(existing.domain);
    }
  }

  await prisma.$transaction([
    prisma.spark.update({
      where: { id: input.id },
      data: sparkData,
    }),
    prisma.sparkCollection.deleteMany({ where: { sparkId: input.id } }),
    prisma.sparkCollection.createMany({
      data: boardIds.map((collectionId) => ({ sparkId: input.id, collectionId })),
    }),
  ]);

  revalidatePath("/library");
  return { error: null };
}

export async function deleteSparkById(id: string): Promise<ActionResult> {
  try {
    await prisma.spark.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this spark. Try again." };
  }
  revalidatePath("/library");
  return { error: null };
}
