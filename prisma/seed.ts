import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { LOCAL_USER_ID } from "../src/lib/constants";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { id: LOCAL_USER_ID },
    update: {},
    create: {
      id: LOCAL_USER_ID,
      name: "Rachel",
    },
  });

  const existingSparks = await prisma.spark.count({ where: { userId: LOCAL_USER_ID } });
  if (existingSparks === 0) await seedSparks();

  const existingCanvases = await prisma.canvas.count({ where: { userId: LOCAL_USER_ID } });
  if (existingCanvases === 0) await seedCanvas();
}

async function seedSparks() {
  const citiesBoard = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: "What makes cities feel alive?" },
  });
  const aiBoard = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: "Physical AI" },
  });

  const sparks: Array<{
    type: "url" | "note";
    title: string;
    description?: string;
    whySaved?: string;
    url?: string;
    mediaType: "text" | "link" | "video" | "image";
    provider?: string;
    thumbnailUrl?: string;
    domain?: string;
    width?: number;
    height?: number;
    boards?: string[];
  }> = [
    {
      type: "url",
      title: "Big Buck Bunny — Official Trailer",
      description: "by Blender Foundation",
      whySaved: "Open-movie CGI still holds up — wanted to see how they lit the grass.",
      url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      mediaType: "video",
      provider: "youtube",
      thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
      domain: "youtube",
      width: 480,
      height: 360,
      boards: [aiBoard.id],
    },
    {
      type: "url",
      title: "Sintel — Official Trailer",
      description: "by Blender Foundation",
      url: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
      mediaType: "video",
      provider: "youtube",
      thumbnailUrl: "https://i.ytimg.com/vi/eRsGyueVLvQ/hqdefault.jpg",
      domain: "youtube",
      width: 480,
      height: 360,
    },
    {
      type: "url",
      title: "The uses of sidewalks: a life",
      description: "On how everyday street activity creates safety and trust.",
      whySaved:
        "This is basically describing my street in one paragraph — wanted to know if it's a real theory or just a nice metaphor.",
      url: "https://example.com/sidewalk-ballet",
      mediaType: "image",
      provider: "web",
      thumbnailUrl: "https://picsum.photos/seed/sidewalk-ballet/640/420",
      domain: "example.com",
      boards: [citiesBoard.id],
    },
    {
      type: "url",
      title: "Desire lines: the paths people actually walk",
      description: "How informal dirt paths reveal what planners got wrong.",
      whySaved: "Love that this is basically crowd-sourced feedback nobody asked for.",
      url: "https://example.com/desire-lines",
      mediaType: "image",
      provider: "web",
      thumbnailUrl: "https://picsum.photos/seed/desire-lines/640/900",
      domain: "example.com",
      boards: [citiesBoard.id],
    },
    {
      type: "url",
      title: "Why we lost our 'third places'",
      description: "Tracks the decline of informal public gathering spots.",
      whySaved: "Explains why so few places near me feel worth lingering in.",
      url: "https://example.com/third-places",
      mediaType: "link",
      provider: "web",
      domain: "example.com",
      boards: [citiesBoard.id],
    },
    {
      type: "note",
      title: "Overheard: 'nobody walks here after 6pm'",
      whySaved: "Wanted to remember the exact phrase before I lost it.",
      mediaType: "text",
      boards: [citiesBoard.id],
    },
    {
      type: "note",
      title: "Idea: a 'curiosity commute' — one new street a week",
      whySaved: "Half-formed personal project, not sure if it goes anywhere yet.",
      mediaType: "text",
    },
  ];

  for (const spark of sparks) {
    await prisma.spark.create({
      data: {
        userId: LOCAL_USER_ID,
        type: spark.type,
        title: spark.title,
        description: spark.description,
        whySaved: spark.whySaved,
        url: spark.url,
        mediaType: spark.mediaType,
        provider: spark.provider,
        thumbnailUrl: spark.thumbnailUrl,
        domain: spark.domain,
        width: spark.width,
        height: spark.height,
        status: spark.boards?.length ? "collected" : "inbox",
        collections: spark.boards
          ? { create: spark.boards.map((collectionId) => ({ collectionId })) }
          : undefined,
      },
    });
  }
}

async function seedCanvas() {
  const [sidewalks, desireLines, overheard] = await Promise.all([
    prisma.spark.findFirst({ where: { userId: LOCAL_USER_ID, title: "The uses of sidewalks: a life" } }),
    prisma.spark.findFirst({ where: { userId: LOCAL_USER_ID, title: "Desire lines: the paths people actually walk" } }),
    prisma.spark.findFirst({ where: { userId: LOCAL_USER_ID, title: "Overheard: 'nobody walks here after 6pm'" } }),
  ]);
  if (!sidewalks || !desireLines || !overheard) return; // sample sparks weren't seeded (real data already existed)

  const canvas = await prisma.canvas.create({
    data: { userId: LOCAL_USER_ID, name: "Cities that feel alive" },
  });

  const [sidewalksNode, desireLinesNode, overheardNode, thoughtNode] = await Promise.all([
    prisma.canvasNode.create({
      data: { canvasId: canvas.id, kind: "spark", sparkId: sidewalks.id, x: 0, y: 0 },
    }),
    prisma.canvasNode.create({
      data: { canvasId: canvas.id, kind: "spark", sparkId: desireLines.id, x: 320, y: -60 },
    }),
    prisma.canvasNode.create({
      data: { canvasId: canvas.id, kind: "spark", sparkId: overheard.id, x: 320, y: 220 },
    }),
    prisma.canvasNode.create({
      data: {
        canvasId: canvas.id,
        kind: "text",
        text: "Maybe it's not the street's design at all — it's whether it gives people a reason to stay.",
        x: 0,
        y: 260,
      },
    }),
  ]);

  await Promise.all([
    prisma.canvasEdge.create({
      data: { canvasId: canvas.id, fromNodeId: sidewalksNode.id, toNodeId: desireLinesNode.id },
    }),
    prisma.canvasEdge.create({
      data: { canvasId: canvas.id, fromNodeId: sidewalksNode.id, toNodeId: overheardNode.id },
    }),
    prisma.canvasEdge.create({
      data: { canvasId: canvas.id, fromNodeId: overheardNode.id, toNodeId: thoughtNode.id },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
