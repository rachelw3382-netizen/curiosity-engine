import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { LOCAL_USER_ID } from "../src/lib/constants";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// Titles the sample mindmap links to — kept here so the canvas and the sparks can't drift apart.
const SAMPLE_TITLES = {
  potluck: "Potluck",
  sundayMorning: "Sunday morning: the only hour nobody wants anything from me",
  perfectDays: "PERFECT DAYS — Official Trailer",
};

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
  const eatingBoard = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: "Eating together" },
  });
  const ritualsBoard = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: "Small rituals" },
  });
  const filmsBoard = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: "Films that stay with me" },
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
    // Eating together
    {
      type: "url",
      title: "Plant stall, Southside farmers market",
      description: "Saturday mornings, before the queue forms.",
      whySaved: "Bought the ugliest tomatoes here and they were the best thing I ate all week.",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Plant_stall_at_the_Southside_Farmers_Market_July_2026.jpg/960px-Plant_stall_at_the_Southside_Farmers_Market_July_2026.jpg",
      mediaType: "image",
      provider: "web",
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Plant_stall_at_the_Southside_Farmers_Market_July_2026.jpg/960px-Plant_stall_at_the_Southside_Farmers_Market_July_2026.jpg",
      domain: "commons.wikimedia.org",
      width: 4032,
      height: 3024,
      boards: [eatingBoard.id],
    },
    {
      type: "url",
      title: SAMPLE_TITLES.potluck,
      description: "Everyone brings one dish, nobody knows what the table will be.",
      whySaved: "The best dinners I've had were all slightly out of someone's control.",
      url: "https://en.wikipedia.org/wiki/Potluck",
      mediaType: "link",
      provider: "web",
      domain: "wikipedia.org",
      boards: [eatingBoard.id],
    },
    {
      type: "note",
      title: "Nan's gravy, on the back of a receipt",
      whySaved: "She never wrote anything down — this is the whole recipe.",
      mediaType: "text",
      boards: [eatingBoard.id],
    },
    // Small rituals
    {
      type: "url",
      title: "Breakfast chiaroscuro",
      description: "Two eggs, one cup, the same window light.",
      whySaved: "My kitchen only does this in November and I keep missing it.",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Breakfast_chiaroscuro.JPG/960px-Breakfast_chiaroscuro.JPG",
      mediaType: "image",
      provider: "web",
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Breakfast_chiaroscuro.JPG/960px-Breakfast_chiaroscuro.JPG",
      domain: "commons.wikimedia.org",
      width: 3264,
      height: 2448,
      boards: [ritualsBoard.id],
    },
    {
      type: "url",
      title: "Third place",
      description: "Cafés, barbers, corner shops — the places that are neither home nor work.",
      whySaved: "Explains why the barber knows my whole family and the café knows my order.",
      url: "https://en.wikipedia.org/wiki/Third_place",
      mediaType: "link",
      provider: "web",
      domain: "wikipedia.org",
      boards: [ritualsBoard.id],
    },
    {
      type: "note",
      title: SAMPLE_TITLES.sundayMorning,
      whySaved: "Wanted to remember how rare that feels before I fill it up with plans.",
      mediaType: "text",
      boards: [ritualsBoard.id],
    },
    // Films that stay with me
    {
      type: "url",
      title: SAMPLE_TITLES.perfectDays,
      description: "by NEON",
      whySaved: "A film about a man cleaning toilets that made me want to slow everything down.",
      url: "https://www.youtube.com/watch?v=QzZBbX5A1FA",
      mediaType: "video",
      provider: "youtube",
      thumbnailUrl: "https://i.ytimg.com/vi/QzZBbX5A1FA/hqdefault.jpg",
      domain: "youtube",
      width: 480,
      height: 360,
      boards: [filmsBoard.id],
    },
    {
      type: "url",
      title: "Past Lives | Official Trailer HD",
      description: "by A24",
      whySaved: "The last ten minutes undid me and I've been thinking about them since.",
      url: "https://www.youtube.com/watch?v=kA244xewjcI",
      mediaType: "video",
      provider: "youtube",
      thumbnailUrl: "https://i.ytimg.com/vi/kA244xewjcI/hqdefault.jpg",
      domain: "youtube",
      width: 480,
      height: 360,
      boards: [filmsBoard.id],
    },
    {
      type: "url",
      title: "The Greatest Films of All Time",
      description: "Sight and Sound's once-a-decade critics' poll.",
      whySaved: "The only list I return to when I want to argue with people I'll never meet.",
      url: "https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time",
      mediaType: "link",
      provider: "web",
      domain: "bfi.org.uk",
      boards: [filmsBoard.id],
    },
    // Inbox
    {
      type: "note",
      title: "Overheard in the queue: 'it's not a party if nobody stays to wash up'",
      whySaved: "A whole theory of hospitality in one sentence.",
      mediaType: "text",
    },
    {
      type: "note",
      title: "Idea: a standing Friday dinner — same table, rotating guests",
      whySaved: "Slightly afraid nobody comes the second week. Would that be so bad?",
      mediaType: "text",
    },
    {
      type: "note",
      title: "Keep meaning to rewatch Paterson — nothing happens and I think about it constantly",
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
  const [potluck, sundayMorning, perfectDays] = await Promise.all([
    prisma.spark.findFirst({ where: { userId: LOCAL_USER_ID, title: SAMPLE_TITLES.potluck } }),
    prisma.spark.findFirst({ where: { userId: LOCAL_USER_ID, title: SAMPLE_TITLES.sundayMorning } }),
    prisma.spark.findFirst({ where: { userId: LOCAL_USER_ID, title: SAMPLE_TITLES.perfectDays } }),
  ]);
  if (!potluck || !sundayMorning || !perfectDays) return; // sample sparks weren't seeded (real data already existed)

  const canvas = await prisma.canvas.create({
    data: { userId: LOCAL_USER_ID, name: "Why some evenings feel like an occasion" },
  });

  const [potluckNode, sundayNode, filmNode, thoughtNode] = await Promise.all([
    prisma.canvasNode.create({
      data: { canvasId: canvas.id, kind: "spark", sparkId: potluck.id, x: 0, y: 0 },
    }),
    prisma.canvasNode.create({
      data: { canvasId: canvas.id, kind: "spark", sparkId: sundayMorning.id, x: 340, y: -70 },
    }),
    prisma.canvasNode.create({
      data: { canvasId: canvas.id, kind: "spark", sparkId: perfectDays.id, x: 340, y: 250 },
    }),
    prisma.canvasNode.create({
      data: {
        canvasId: canvas.id,
        kind: "text",
        text: "Maybe it isn't the food or the plan — it's that somebody else is expecting you.",
        x: 0,
        y: 300,
      },
    }),
  ]);

  await Promise.all([
    prisma.canvasEdge.create({
      data: { canvasId: canvas.id, fromNodeId: potluckNode.id, toNodeId: sundayNode.id },
    }),
    prisma.canvasEdge.create({
      data: { canvasId: canvas.id, fromNodeId: sundayNode.id, toNodeId: thoughtNode.id },
    }),
    prisma.canvasEdge.create({
      data: { canvasId: canvas.id, fromNodeId: filmNode.id, toNodeId: thoughtNode.id },
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
