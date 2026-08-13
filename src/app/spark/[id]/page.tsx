import { notFound } from "next/navigation";
import { SparkDetail } from "@/components/SparkDetail";
import { prisma } from "@/lib/prisma";
import { LOCAL_USER_ID } from "@/lib/constants";
import { getRelatedContent } from "@/lib/related-content";

export default async function SparkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const spark = await prisma.spark.findUnique({
    where: { id },
    include: { collections: { include: { collection: true } } },
  });

  if (!spark || spark.userId !== LOCAL_USER_ID) notFound();

  const [collections, relatedContent] = await Promise.all([
    prisma.collection.findMany({
      where: { userId: LOCAL_USER_ID, archivedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    getRelatedContent(spark),
  ]);

  return (
    <SparkDetail
      spark={spark}
      collections={collections}
      boardIds={spark.collections.map((c) => c.collectionId)}
      boardNames={spark.collections.map((c) => c.collection.name)}
      relatedContent={relatedContent}
    />
  );
}
