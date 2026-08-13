import Link from "next/link";
import { BoardChip } from "@/components/BoardChip";
import { CaptureForm } from "@/components/CaptureForm";
import { CreateCollectionInline } from "@/components/CreateCollectionInline";
import { LibrarySparkCard } from "@/components/LibrarySparkCard";
import { Reveal } from "@/components/motion/Reveal";
import { prisma } from "@/lib/prisma";
import { LOCAL_USER_ID } from "@/lib/constants";
import { distributeIntoColumns } from "@/lib/masonry";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board } = await searchParams;

  const [sparks, collections] = await Promise.all([
    prisma.spark.findMany({
      where: {
        userId: LOCAL_USER_ID,
        status: { not: "archived" },
        ...(board ? { collections: { some: { collectionId: board } } } : {}),
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
    <main className="mx-auto flex w-full max-w-[936px] flex-1 flex-col gap-8 px-6 py-16">
      <Reveal className="flex flex-col gap-2">
        <h1 className="text-heading text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Spark Library
        </h1>
        <p className="text-body max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Links, videos and passing thoughts, saved with a quick note on why
          they caught your attention. Sort them into boards whenever you
          like — nothing needs filing before it&apos;s useful.
        </p>
      </Reveal>

      <CaptureForm collections={collections} />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/library"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !board
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "border border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300"
          }`}
        >
          All
        </Link>
        {collections.map((collection) => (
          <BoardChip
            key={collection.id}
            id={collection.id}
            name={collection.name}
            active={board === collection.id}
          />
        ))}
        <CreateCollectionInline />
      </div>

      {sparks.length === 0 ? (
        <Reveal className="rounded-2xl border border-dashed border-black/[.12] p-10 text-center dark:border-white/[.15]">
          <p className="text-body text-sm text-zinc-500 dark:text-zinc-400">
            {board
              ? "Nothing in this board yet."
              : "Nothing saved yet — add your first spark above."}
          </p>
        </Reveal>
      ) : (
        (() => {
          const indexed = sparks.map((spark, index) => ({ spark, index }));
          const renderCard = ({ spark, index }: (typeof indexed)[number]) => (
            <Reveal key={spark.id} delay={Math.min(index, 8) * 0.04}>
              <LibrarySparkCard
                spark={spark}
                collections={collections}
                boardIds={spark.collections.map((c) => c.collectionId)}
              />
            </Reveal>
          );
          return (
            <>
              <div className="flex flex-col gap-3 sm:hidden">
                {indexed.map((item) => renderCard(item))}
              </div>
              <div className="hidden gap-3 sm:flex lg:hidden">
                {distributeIntoColumns(indexed, 2).map((column, colIndex) => (
                  <div key={colIndex} className="flex w-72 shrink-0 grow-0 flex-col gap-3">
                    {column.map((item) => renderCard(item))}
                  </div>
                ))}
              </div>
              <div className="hidden gap-3 lg:flex">
                {distributeIntoColumns(indexed, 3).map((column, colIndex) => (
                  <div key={colIndex} className="flex w-72 shrink-0 grow-0 flex-col gap-3">
                    {column.map((item) => renderCard(item))}
                  </div>
                ))}
              </div>
            </>
          );
        })()
      )}
    </main>
  );
}
