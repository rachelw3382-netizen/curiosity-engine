"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Redo2, Undo2 } from "lucide-react";
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
import { SaveIndicator, SaveProvider, useSaveTracker } from "@/components/canvas/save-status";
import { clampFontSize, DEFAULT_FONT_SIZE } from "@/components/canvas/text-style-options";
import { CanvasEditContext, type CanvasEdit } from "@/components/canvas/canvas-edit";
import {
  renameCanvas,
  syncCanvas,
  validateImageUrl,
  type SyncEdge,
  type SyncNode,
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

const HISTORY_LIMIT = 100;
const AUTOSAVE_DELAY_MS = 400;

type Snapshot = { nodes: FlowNode[]; edges: Edge[] };

/** Strips React Flow's runtime-only fields (selected, measured, dragging…) from a node. */
function cleanNode(n: FlowNode): FlowNode {
  const copy = { id: n.id, type: n.type, position: { ...n.position }, data: { ...n.data } } as FlowNode;
  if (n.width != null) copy.width = n.width;
  if (n.height != null) copy.height = n.height;
  return copy;
}

function cleanEdge(e: Edge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  };
}

/** The database row a node maps to. */
function toSyncNode(n: FlowNode): SyncNode {
  const base = { id: n.id, x: n.position.x, y: n.position.y };
  if (n.type === "spark") {
    return {
      ...base,
      kind: "spark",
      sparkId: n.data.spark.id,
      detailLevel: n.data.detailLevel,
      width: n.data.hasCustomWidth ? (n.width ?? null) : null,
    };
  }
  if (n.type === "image") {
    return { ...base, kind: "image", imageUrl: n.data.imageUrl };
  }
  return {
    ...base,
    kind: "text",
    text: n.data.text,
    fontSize: n.data.fontSize,
    fontFamily: n.data.fontFamily,
    textColor: n.data.textColor,
    backgroundColor: n.data.backgroundColor,
    width: n.width ?? null,
    height: n.height ?? null,
  };
}

function toSyncEdge(e: Edge): SyncEdge {
  return {
    id: e.id,
    fromNodeId: e.source,
    toNodeId: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  };
}

/** Rows for the current canvas; edges whose node is gone are dropped. */
function toRows(nodes: FlowNode[], edges: Edge[]) {
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes: nodes.map(toSyncNode),
    edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map(toSyncEdge),
  };
}

function snapshotKey(snapshot: Snapshot) {
  return JSON.stringify(toRows(snapshot.nodes, snapshot.edges));
}

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
  const { state: saveState, save, setDirty } = useSaveTracker();
  const [name, setName] = useState(canvasName);
  const [sparkModalOpen, setSparkModalOpen] = useState(false);
  const [pictureModalOpen, setPictureModalOpen] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>(
    initialNodes.map(toFlowNode).filter((n): n is FlowNode => n !== null),
  );
  const [edges, setEdges] = useState<Edge[]>(
    initialEdges.map((edge) => ({
      id: edge.id,
      source: edge.fromNodeId,
      target: edge.toNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })),
  );

  // Always-current copies for event handlers (history snapshots, autosave).
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // ---- Sparks still available to add: everything that isn't currently on the canvas.
  // Derived (not stored) so undo/redo of an add or delete keeps the picker correct.
  const sparkPool = useMemo<SparkWithBoards[]>(
    () => [
      ...initialNodes
        .filter((n): n is DbNode & { spark: Spark } => n.spark !== null)
        .map((n) => ({ ...n.spark, collections: [] })),
      ...availableSparks,
    ],
    [initialNodes, availableSparks],
  );
  const remainingSparks = useMemo(() => {
    const used = new Set(
      nodes.filter((n): n is SparkFlowNode => n.type === "spark").map((n) => n.data.spark.id),
    );
    return sparkPool.filter((s) => !used.has(s.id));
  }, [nodes, sparkPool]);

  // ---- Undo / redo: a stack of whole-canvas snapshots taken *before* each edit.
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const lastCheckpoint = useRef<{ group?: string; at: number }>({ at: 0 });
  const [history, setHistory] = useState({ undo: 0, redo: 0 });

  const takeSnapshot = useCallback(
    (): Snapshot => ({
      nodes: nodesRef.current.map(cleanNode),
      edges: edgesRef.current.map(cleanEdge),
    }),
    [],
  );

  const syncHistoryCounts = useCallback(
    () => setHistory({ undo: past.current.length, redo: future.current.length }),
    [],
  );

  const checkpoint = useCallback(
    (group?: string, windowMs = 0) => {
      const now = Date.now();
      const last = lastCheckpoint.current;
      lastCheckpoint.current = { group, at: now };
      if (group && last.group === group && now - last.at < windowMs) return;
      past.current.push(takeSnapshot());
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = [];
      syncHistoryCounts();
    },
    [takeSnapshot, syncHistoryCounts],
  );

  const applySnapshot = useCallback((snapshot: Snapshot) => {
    lastCheckpoint.current = { at: 0 };
    setNodes(snapshot.nodes.map(cleanNode));
    setEdges(snapshot.edges.map(cleanEdge));
  }, []);

  const stepHistory = useCallback(
    (from: Snapshot[], to: Snapshot[]) => {
      const current = takeSnapshot();
      const currentKey = snapshotKey(current);
      let target: Snapshot | undefined;
      // Skip steps that wouldn't visibly change anything (e.g. a click that didn't move a card).
      while ((target = from.pop())) {
        if (snapshotKey(target) !== currentKey) break;
        target = undefined;
      }
      if (target) {
        to.push(current);
        applySnapshot(target);
      }
      syncHistoryCounts();
    },
    [takeSnapshot, applySnapshot, syncHistoryCounts],
  );

  const undo = useCallback(() => stepHistory(past.current, future.current), [stepHistory]);
  const redo = useCallback(() => stepHistory(future.current, past.current), [stepHistory]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Inside a text box, ⌘Z belongs to the browser's own typing undo.
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // ---- Autosave: diff the canvas against what the database last received, then send only
  // the changes. Every edit — including undo and redo — saves through this one path.
  type SavedRows = { nodes: Map<string, string>; edges: Map<string, string> };
  const saved = useRef<SavedRows>({ nodes: new Map(), edges: new Map() });
  // Seed with what the server sent, before the first diff runs (effects run in order).
  useEffect(() => {
    const flowNodes = initialNodes.map(toFlowNode).filter((n): n is FlowNode => n !== null);
    const flowEdges: Edge[] = initialEdges.map((e) => ({
      id: e.id,
      source: e.fromNodeId,
      target: e.toNodeId,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));
    const rows = toRows(flowNodes, flowEdges);
    saved.current = {
      nodes: new Map(rows.nodes.map((r) => [r.id, JSON.stringify(r)])),
      edges: new Map(rows.edges.map((r) => [r.id, JSON.stringify(r)])),
    };
    // Only on mount: later prop refreshes must not overwrite what we've tracked as saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const needsFullSync = useRef(false);
  const flushRef = useRef<() => void>(() => {});

  const computeChanges = useCallback(() => {
    const store = saved.current;
    const rows = toRows(nodesRef.current, edgesRef.current);
    const nodeKeys = new Map(rows.nodes.map((r) => [r.id, JSON.stringify(r)]));
    const edgeKeys = new Map(rows.edges.map((r) => [r.id, JSON.stringify(r)]));
    return {
      rows,
      nodeKeys,
      edgeKeys,
      changes: {
        nodes: rows.nodes.filter((r) => store.nodes.get(r.id) !== nodeKeys.get(r.id)),
        edges: rows.edges.filter((r) => store.edges.get(r.id) !== edgeKeys.get(r.id)),
        deletedNodeIds: [...store.nodes.keys()].filter((id) => !nodeKeys.has(id)),
        deletedEdgeIds: [...store.edges.keys()].filter((id) => !edgeKeys.has(id)),
      },
    };
  }, []);

  const flush = useCallback(() => {
    const { rows, nodeKeys, edgeKeys, changes } = computeChanges();
    const nothingToSend =
      !changes.nodes.length &&
      !changes.edges.length &&
      !changes.deletedNodeIds.length &&
      !changes.deletedEdgeIds.length;
    if (nothingToSend && !needsFullSync.current) {
      setDirty(false);
      return;
    }
    const payload = needsFullSync.current
      ? { ...changes, nodes: rows.nodes, edges: rows.edges, full: true }
      : changes;
    needsFullSync.current = false;
    // Optimistic: later diffs build on this, and the serial save queue keeps writes in order.
    saved.current = { nodes: nodeKeys, edges: edgeKeys };
    setDirty(false);
    save(() => syncCanvas(canvasId, payload)).then((ok) => {
      if (ok) return;
      // Couldn't save even after retries — resend the whole canvas on the next attempt.
      needsFullSync.current = true;
      setTimeout(() => flushRef.current(), 5000);
    });
  }, [canvasId, computeChanges, save, setDirty]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    if (!needsFullSync.current) {
      const { changes } = computeChanges();
      const unsaved =
        changes.nodes.length ||
        changes.edges.length ||
        changes.deletedNodeIds.length ||
        changes.deletedEdgeIds.length;
      if (!unsaved) return;
    }
    setDirty(true);
    const timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [nodes, edges, computeChanges, flush, setDirty]);

  // Don't wait out the debounce when the tab is hidden or closed.
  useEffect(() => {
    const flushNow = () => flush();
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", flushNow);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", flushNow);
      flushNow();
    };
  }, [flush]);

  // ---- What node components can do
  const patchNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    setNodes((current) =>
      current.map((n) => (n.id === nodeId ? ({ ...n, data: { ...n.data, ...patch } } as FlowNode) : n)),
    );
  }, []);

  const edit = useMemo<CanvasEdit>(
    () => ({ checkpoint, patchNodeData }),
    [checkpoint, patchNodeData],
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
      if (changes.some((c) => c.type === "remove")) checkpoint("delete", 300);
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [checkpoint],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.some((c) => c.type === "remove")) checkpoint("delete", 300);
      setEdges((current) => applyEdgeChanges(changes, current));
    },
    [checkpoint],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      checkpoint();
      setEdges((eds) => addEdge({ ...connection, id: crypto.randomUUID() }, eds));
    },
    [checkpoint],
  );

  const onDragStart = useCallback(() => checkpoint(), [checkpoint]);

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

  function handleAddSpark(sparkId: string) {
    const spark = remainingSparks.find((s) => s.id === sparkId);
    if (!spark) return;
    checkpoint();
    const position = centerPosition();
    setNodes((nds) => [
      ...nds,
      {
        id: crypto.randomUUID(),
        type: "spark",
        position,
        data: { spark, detailLevel: "compact" },
      },
    ]);
  }

  function handleAddManySparks(sparkIds: string[]) {
    const sparksToAdd = remainingSparks.filter((s) => sparkIds.includes(s.id));
    if (!sparksToAdd.length) return;
    checkpoint();
    const positions = findOpenPositions(
      sparksToAdd.length,
      viewportCenter(),
      nodes.map((n) => n.position),
    );
    setNodes((nds) => [
      ...nds,
      ...sparksToAdd.map(
        (spark, i): SparkFlowNode => ({
          id: crypto.randomUUID(),
          type: "spark",
          position: positions[i],
          data: { spark, detailLevel: "compact" },
        }),
      ),
    ]);
  }

  function handleAddText() {
    checkpoint();
    const position = centerPosition();
    setNodes((nds) => [
      ...nds,
      { id: crypto.randomUUID(), type: "text", position, data: { text: "", ...DEFAULT_TEXT_STYLE } },
    ]);
  }

  async function handleAddImage(imageUrl: string) {
    try {
      await validateImageUrl(imageUrl);
    } catch {
      window.alert("That image URL can't be used. Try uploading the picture instead.");
      return;
    }
    checkpoint();
    const position = centerPosition();
    setNodes((nds) => [
      ...nds,
      { id: crypto.randomUUID(), type: "image", position, data: { imageUrl } },
    ]);
  }

  return (
    <SaveProvider value={save}>
    <CanvasEditContext.Provider value={edit}>
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
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed) save(() => renameCanvas(canvasId, trimmed));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="text-heading rounded-lg bg-transparent px-1 text-lg font-semibold text-zinc-900 outline-none focus:bg-zinc-900/[.04] dark:text-zinc-50 dark:focus:bg-white/[.06]"
        />
        <SaveIndicator state={saveState} />
      </div>

      <div className="relative flex-1">
        <ReactFlow
          nodes={renderNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onDragStart}
          onSelectionDragStart={onDragStart}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.25 }}
        >
          <Background gap={24} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>

        <div className="absolute bottom-4 left-16 z-10 flex items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-900">
            <button
              type="button"
              onClick={undo}
              disabled={history.undo === 0}
              aria-label="Undo"
              title="Undo (⌘Z)"
              className="flex h-9 w-10 items-center justify-center text-zinc-800 hover:bg-zinc-900/[.06] disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-200 dark:hover:bg-white/[.1]"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={history.redo === 0}
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              className="flex h-9 w-10 items-center justify-center border-l border-black/[.08] text-zinc-800 hover:bg-zinc-900/[.06] disabled:opacity-30 disabled:hover:bg-transparent dark:border-white/[.145] dark:text-zinc-200 dark:hover:bg-white/[.1]"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
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
    </CanvasEditContext.Provider>
    </SaveProvider>
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
