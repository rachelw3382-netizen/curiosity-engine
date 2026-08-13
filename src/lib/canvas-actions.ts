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

export async function addSparkNode(canvasId: string, sparkId: string, x: number, y: number) {
  const node = await prisma.canvasNode.create({
    data: { canvasId, kind: "spark", sparkId, x, y },
    include: { spark: true },
  });
  revalidatePath(`/mindmap/${canvasId}`);
  return node;
}

export async function addTextNode(canvasId: string, x: number, y: number) {
  const node = await prisma.canvasNode.create({
    data: { canvasId, kind: "text", text: "", x, y },
  });
  revalidatePath(`/mindmap/${canvasId}`);
  return node;
}

export async function updateNodePosition(nodeId: string, x: number, y: number) {
  await prisma.canvasNode.update({ where: { id: nodeId }, data: { x, y } });
}

export async function updateNodeDetailLevel(
  nodeId: string,
  detailLevel: "compact" | "detailed",
) {
  await prisma.canvasNode.update({ where: { id: nodeId }, data: { detailLevel } });
}

export async function updateTextNodeContent(nodeId: string, text: string) {
  await prisma.canvasNode.update({ where: { id: nodeId }, data: { text } });
}

export async function updateTextNodeStyle(nodeId: string, style: TextNodeStyle) {
  await prisma.canvasNode.update({ where: { id: nodeId }, data: style });
}

export async function updateNodeSize(nodeId: string, width: number, height: number) {
  await prisma.canvasNode.update({ where: { id: nodeId }, data: { width, height } });
}

export async function addImageNode(canvasId: string, imageUrl: string, x: number, y: number) {
  // Local /uploads files are same-origin (relative path); only paste-URL images need the check.
  if (/^https?:\/\//i.test(imageUrl)) {
    try {
      assertPublicHttpUrl(imageUrl);
    } catch (err) {
      if (err instanceof UnsafeUrlError) throw err;
      throw new UnsafeUrlError("Not a valid image URL.");
    }
  }
  const node = await prisma.canvasNode.create({
    data: { canvasId, kind: "image", imageUrl, x, y },
  });
  revalidatePath(`/mindmap/${canvasId}`);
  return node;
}

export async function deleteCanvasNode(nodeId: string) {
  await prisma.canvasNode.delete({ where: { id: nodeId } });
}

export async function createCanvasEdge(canvasId: string, fromNodeId: string, toNodeId: string) {
  const edge = await prisma.canvasEdge.create({
    data: { canvasId, fromNodeId, toNodeId },
  });
  return edge;
}

export async function deleteCanvasEdge(edgeId: string) {
  await prisma.canvasEdge.delete({ where: { id: edgeId } });
}
