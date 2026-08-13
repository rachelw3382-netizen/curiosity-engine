import { CanvasCard } from "@/components/CanvasCard";
import { CreateCanvasInline } from "@/components/CreateCanvasInline";
import { Reveal } from "@/components/motion/Reveal";
import { prisma } from "@/lib/prisma";
import { LOCAL_USER_ID } from "@/lib/constants";

export default async function MindmapIndexPage() {
  const canvases = await prisma.canvas.findMany({
    where: { userId: LOCAL_USER_ID },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { nodes: true, edges: true } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <Reveal className="flex flex-col gap-2">
        <h1 className="text-heading text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Mindmaps
        </h1>
        <p className="text-body max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Freeform spaces to connect sparks and type out the thoughts between
          them. Positions, notes and connections save as you go.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canvases.map((canvas, index) => (
          <Reveal key={canvas.id} delay={Math.min(index, 6) * 0.04}>
            <CanvasCard
              id={canvas.id}
              name={canvas.name}
              nodeCount={canvas._count.nodes}
              edgeCount={canvas._count.edges}
            />
          </Reveal>
        ))}
        <CreateCanvasInline />
      </div>
    </main>
  );
}
