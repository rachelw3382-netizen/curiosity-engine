import { notFound } from "next/navigation";
import { MindmapCanvas } from "@/components/canvas/MindmapCanvas";
import { prisma } from "@/lib/prisma";
import { LOCAL_USER_ID } from "@/lib/constants";

export default async function MindmapCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canvas = await prisma.canvas.findUnique({
    where: { id },
    include: {
      nodes: { include: { spark: true } },
      edges: true,
    },
  });

  if (!canvas || canvas.userId !== LOCAL_USER_ID) notFound();

  const usedSparkIds = canvas.nodes
    .filter((node) => node.sparkId)
    .map((node) => node.sparkId as string);

  const [availableSparks, boards] = await Promise.all([
    prisma.spark.findMany({
      where: {
        userId: LOCAL_USER_ID,
        status: { not: "archived" },
        id: { notIn: usedSparkIds },
      },
      orderBy: { createdAt: "desc" },
      include: { collections: true },
    }),
    prisma.collection.findMany({
      where: { userId: LOCAL_USER_ID, archivedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <MindmapCanvas
      canvasId={canvas.id}
      canvasName={canvas.name}
      initialNodes={canvas.nodes}
      initialEdges={canvas.edges}
      availableSparks={availableSparks}
      boards={boards}
    />
  );
}
