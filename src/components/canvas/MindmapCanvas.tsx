"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from "@xyflow/react";
import { AddPictureModal } from "@/components/canvas/AddPictureModal";
import { AddSparkPanel } from "@/components/canvas/AddSparkPanel";
import { ImageNode, type ImageFlowNode } from "@/components/canvas/ImageNode";
import { SparkNode, type SparkFlowNode } from "@/components/canvas/SparkNode";
import { TextNode, type TextFlowNode } from "@/components/canvas/TextNode";
import { clampFontSize, DEFAULT_FONT_SIZE } from "@/components/canvas/text-style-options";
import {
  addImageNode,
  addSparkNode,
  addTextNode,
  createCanvasEdge,
  deleteCanvasEdge,
  deleteCanvasNode,
  renameCanvas,
  updateNodePosition,
} from "@/lib/canvas-actions";
import type { CanvasEdge, CanvasNode, Spark } from "@/generated/prisma/client";

type DbNode = CanvasNode & { spark: Spark | null };
type FlowNode = SparkFlowNode | TextFlowNode | ImageFlowNode;
type SparkWithBoards = Spark & { collections: { collectionId: string }[] };

const nodeTypes: NodeTypes = { spark: SparkNode, text: TextNode, image: ImageNode };

const GRID_CELL_WIDTH = 340;
const GRID_CELL_HEIGHT = 420;
const GRID_MIN_DISTANCE = 340;

/**
 * Finds `count` positions near `origin` that don't collide with `occupied` (existing
 * node positions) or with each other — used for bulk-adding sparks so they land in
 * open space around the canvas instead of stacked on top of one another.
 */
function findOpenPositions(
  count: number,
  origin: { x: number; y: number },
  occupied: { x: number; y: number }[],
): { x: number; y: number }[] {
  const results: { x: number; y: number }[] = [];
  const taken = [...occupied];
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));

  for (let row = 0; results.length < count && row < count + 10; row++) {
    const rowCols = cols + row;
    for (let col = 0; col < rowCols && results.length < count; col++) {
      const candidate = {
        x: origin.x + (col - (rowCols - 1) / 2) * GRID_CELL_WIDTH,
        y: origin.y + row * GRID_CELL_HEIGHT,
      };
      const tooClose = taken.some(
        (p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) < GRID_MIN_DISTANCE,
      );
      if (!tooClose) {
        results.push(candidate);
        taken.push(candidate);
      }
    }
  }
  return results;
}

const DEFAULT_TEXT_STYLE = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: "sans" as const,
  textColor: "ink" as const,
  backgroundColor: "amber" as const,
};

function toFlowNode(node: DbNode): FlowNode | null {
  if (node.kind === "spark") {
    if (!node.spark) return null;
    const flowNode: SparkFlowNode = {
      id: node.id,
      type: "spark",
      position: { x: node.x, y: node.y },
      data: {
        spark: node.spark,
        detailLevel: node.detailLevel === "detailed" ? "detailed" : "compact",
      },
    };
    if (node.width != null) {
      flowNode.width = node.width;
      flowNode.data.hasCustomWidth = true;
    }
    return flowNode;
  }
  if (node.kind === "image") {
    if (!node.imageUrl) return null;
    return {
      id: node.id,
      type: "image",
      position: { x: node.x, y: node.y },
      data: { imageUrl: node.imageUrl },
    };
  }
  const flowNode: TextFlowNode = {
    id: node.id,
    type: "text",
    position: { x: node.x, y: node.y },
    data: {
      text: node.text ?? "",
      fontSize: clampFontSize(node.fontSize),
      fontFamily: node.fontFamily === "serif" || node.fontFamily === "mono" ? node.fontFamily : "sans",
      textColor: node.textColor || "ink",
      backgroundColor: node.backgroundColor || "amber",
    },
  };
  if (node.width != null && node.height != null) {
    flowNode.width = node.width;
    flowNode.height = node.height;
  }
  return flowNode;
}

function CanvasInner({
  canvasId,
  canvasName,
  initialNodes,
  initialEdges,
  availableSparks,
  boards,
}: {
  canvasId: string;
  canvasName: string;
  initialNodes: DbNode[];
  initialEdges: CanvasEdge[];
  availableSparks: SparkWithBoards[];
  boards: { id: string; name: string }[];
}) {
  const { screenToFlowPosition } = useReactFlow();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(canvasName);
  const [remainingSparks, setRemainingSparks] = useState(availableSparks);
  const [sparkModalOpen, setSparkModalOpen] = useState(false);
  const [pictureModalOpen, setPictureModalOpen] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>(
    initialNodes.map(toFlowNode).filter((n): n is FlowNode => n !== null),
  );
  const [edges, setEdges] = useState<Edge[]>(
    initialEdges.map((edge) => ({ id: edge.id, source: edge.fromNodeId, target: edge.toNodeId })),
  );

  const setSparkNodeWidth = useCallback((nodeId: string, width: number | null) => {
    setNodes((current) => current.map((n) => (n.id === nodeId ? { ...n, width: width ?? undefined } : n)));
  }, []);

  const renderNodes = useMemo(
    () =>
      nodes.map((n) =>
        n.type === "spark" ? { ...n, data: { ...n.data, onWidthChange: setSparkNodeWidth } } : n,
      ),
    [nodes, setSparkNodeWidth],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      const removed = changes.filter((c) => c.type === "remove");
      if (removed.length) {
        const removedSparks: SparkWithBoards[] = removed
          .map((change) => nodes.find((n) => n.id === change.id))
          .filter((n): n is SparkFlowNode => n?.type === "spark")
          .map((n) => ({ ...n.data.spark, collections: [] }));
        if (removedSparks.length) {
          setRemainingSparks((sparks) => [...removedSparks, ...sparks]);
        }
        setNodes((current) => applyNodeChanges(changes, current));
        startTransition(() => {
          removed.forEach((change) => {
            deleteCanvasNode(change.id);
          });
        });
      } else {
        setNodes((current) => applyNodeChanges(changes, current));
      }
    },
    [nodes, startTransition],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const removed = changes.filter((c) => c.type === "remove");
      if (removed.length) {
        startTransition(() => {
          removed.forEach((change) => {
            deleteCanvasEdge(change.id);
          });
        });
      }
      setEdges((current) => applyEdgeChanges(changes, current));
    },
    [startTransition],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      setEdges((eds) => addEdge({ ...connection, id: tempId }, eds));
      startTransition(async () => {
        const edge = await createCanvasEdge(canvasId, connection.source!, connection.target!);
        setEdges((eds) => eds.map((e) => (e.id === tempId ? { ...e, id: edge.id } : e)));
      });
    },
    [canvasId, startTransition],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: { id: string; position: { x: number; y: number } }) => {
      startTransition(async () => {
        await updateNodePosition(node.id, node.position.x, node.position.y);
      });
    },
    [startTransition],
  );

  function viewportCenter() {
    return screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }

  function centerPosition() {
    const center = viewportCenter();
    return {
      x: center.x + (Math.random() - 0.5) * 120,
      y: center.y + (Math.random() - 0.5) * 120,
    };
  }

  async function handleAddSpark(sparkId: string) {
    const spark = remainingSparks.find((s) => s.id === sparkId);
    if (!spark) return;
    const { x, y } = centerPosition();
    const node = await addSparkNode(canvasId, sparkId, x, y);
    setNodes((nds) => [
      ...nds,
      {
        id: node.id,
        type: "spark",
        position: { x, y },
        data: { spark, detailLevel: "compact" },
      },
    ]);
    setRemainingSparks((sparks) => sparks.filter((s) => s.id !== sparkId));
  }

  async function handleAddManySparks(sparkIds: string[]) {
    const sparksToAdd = remainingSparks.filter((s) => sparkIds.includes(s.id));
    if (!sparksToAdd.length) return;
    const positions = findOpenPositions(
      sparksToAdd.length,
      viewportCenter(),
      nodes.map((n) => n.position),
    );
    const created = await Promise.all(
      sparksToAdd.map(async (spark, i) => ({
        node: await addSparkNode(canvasId, spark.id, positions[i].x, positions[i].y),
        spark,
        position: positions[i],
      })),
    );
    setNodes((nds) => [
      ...nds,
      ...created.map(({ node, spark, position }): SparkFlowNode => ({
        id: node.id,
        type: "spark",
        position,
        data: { spark, detailLevel: "compact" },
      })),
    ]);
    const addedIds = new Set(sparksToAdd.map((s) => s.id));
    setRemainingSparks((sparks) => sparks.filter((s) => !addedIds.has(s.id)));
  }

  async function handleAddText() {
    const { x, y } = centerPosition();
    const node = await addTextNode(canvasId, x, y);
    setNodes((nds) => [
      ...nds,
      { id: node.id, type: "text", position: { x, y }, data: { text: "", ...DEFAULT_TEXT_STYLE } },
    ]);
  }

  async function handleAddImage(imageUrl: string) {
    const { x, y } = centerPosition();
    const node = await addImageNode(canvasId, imageUrl, x, y);
    setNodes((nds) => [
      ...nds,
      { id: node.id, type: "image", position: { x, y }, data: { imageUrl } },
    ]);
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <div className="flex items-center gap-3 border-b border-black/[.06] px-6 py-3 dark:border-white/[.08]">
        <Link
          href="/mindmap"
          aria-label="Back to mindmaps"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900/[.06] dark:text-zinc-400 dark:hover:bg-white/[.1]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => startTransition(() => renameCanvas(canvasId, name))}
          className="text-heading rounded-lg bg-transparent px-1 text-lg font-semibold text-zinc-900 outline-none focus:bg-zinc-900/[.04] dark:text-zinc-50 dark:focus:bg-white/[.06]"
        />
      </div>

      <div className="relative flex-1">
        <ReactFlow
          nodes={renderNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.25 }}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>

        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          <button
            type="button"
            onClick={() => setSparkModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            + Spark
          </button>
          <button
            type="button"
            onClick={handleAddText}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/[.08] bg-white px-4 text-sm font-medium text-zinc-800 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-200"
          >
            + Text
          </button>
          <button
            type="button"
            onClick={() => setPictureModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/[.08] bg-white px-4 text-sm font-medium text-zinc-800 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-200"
          >
            + Picture
          </button>
        </div>

        {sparkModalOpen ? (
          <AddSparkPanel
            sparks={remainingSparks}
            boards={boards}
            onAdd={handleAddSpark}
            onAddMany={handleAddManySparks}
            onClose={() => setSparkModalOpen(false)}
          />
        ) : null}
      </div>

      {pictureModalOpen ? (
        <AddPictureModal onAdd={handleAddImage} onClose={() => setPictureModalOpen(false)} />
      ) : null}
    </div>
  );
}

export function MindmapCanvas(props: {
  canvasId: string;
  canvasName: string;
  initialNodes: DbNode[];
  initialEdges: CanvasEdge[];
  availableSparks: SparkWithBoards[];
  boards: { id: string; name: string }[];
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
