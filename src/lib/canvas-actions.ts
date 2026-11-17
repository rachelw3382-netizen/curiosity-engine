"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LOCAL_USER_ID } from "@/lib/constants";
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/link-metadata";

export interface TextNodeStyle {
  fontSize?: number;
  fontFamily?: "sans" | "serif" | "mono";
  textColor?: string;
  backgroundColor?: string;
}

export async function createCanvas(name: string) {
  const canvas = await prisma.canvas.create({
    data: { userId: LOCAL_USER_ID, name: name.trim() || "Untitled mindmap" },
  });
  revalidatePath("/mindmap");
  redirect(`/mindmap/${canvas.id}`);
}

export async function renameCanvas(canvasId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await prisma.canvas.update({ where: { id: canvasId }, data: { name: trimmed } });
  revalidatePath(`/mindmap/${canvasId}`);
  revalidatePath("/mindmap");
}

export async function deleteCanvas(canvasId: string) {
  await prisma.canvas.delete({ where: { id: canvasId } });
  revalidatePath("/mindmap");
  redirect("/mindmap");
}

export interface SyncNode {
  id: string;
  kind: "spark" | "text" | "image";
  sparkId?: string | null;
  text?: string | null;
  imageUrl?: string | null;
  x: number;
  y: number;
  detailLevel?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  width?: number | null;
  height?: number | null;
}

export interface SyncEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface CanvasChanges {
  nodes: SyncNode[]; // new or changed nodes (upserted)
  deletedNodeIds: string[];
  edges: SyncEdge[]; // new or changed edges (upserted)
  deletedEdgeIds: string[];
  /** Recovery mode: also delete anything on this canvas that isn't listed in nodes/edges. */
  full?: boolean;
}

/**
 * The single write path for the mindmap: the client sends what changed since its last
 * save (adds, moves, text/style/size edits, deletes, undo/redo) and this applies it atomically.
 */
export async function syncCanvas(canvasId: string, changes: CanvasChanges) {
  for (const node of changes.nodes) {
    // Local /uploads files are same-origin (relative path); only pasted-URL images need the check.
    if (node.kind === "image" && node.imageUrl && /^https?:\/\//i.test(node.imageUrl)) {
      try {
        assertPublicHttpUrl(node.imageUrl);
      } catch (err) {
        if (err instanceof UnsafeUrlError) throw err;
        throw new UnsafeUrlError("Not a valid image URL.");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (changes.full) {
      await tx.canvasEdge.deleteMany({
        where: { canvasId, id: { notIn: changes.edges.map((e) => e.id) } },
      });
      await tx.canvasNode.deleteMany({
        where: { canvasId, id: { notIn: changes.nodes.map((n) => n.id) } },
      });
    }
    if (changes.deletedEdgeIds.length) {
      await tx.canvasEdge.deleteMany({ where: { canvasId, id: { in: changes.deletedEdgeIds } } });
    }
    if (changes.deletedNodeIds.length) {
      await tx.canvasNode.deleteMany({ where: { canvasId, id: { in: changes.deletedNodeIds } } });
    }
    for (const { id, ...data } of changes.nodes) {
      const updated = await tx.canvasNode.updateMany({ where: { id, canvasId }, data });
      if (updated.count === 0) await tx.canvasNode.create({ data: { id, canvasId, ...data } });
    }
    for (const { id, ...data } of changes.edges) {
      const updated = await tx.canvasEdge.updateMany({ where: { id, canvasId }, data });
      if (updated.count === 0) await tx.canvasEdge.create({ data: { id, canvasId, ...data } });
    }
  });
}

/** Pre-flight check so an unsafe pasted image URL is rejected before it lands on the canvas. */
export async function validateImageUrl(imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) {
    try {
      assertPublicHttpUrl(imageUrl);
    } catch (err) {
      if (err instanceof UnsafeUrlError) throw err;
      throw new UnsafeUrlError("Not a valid image URL.");
    }
  }
}
