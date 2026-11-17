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
  const board = await prisma.collection.create({
    data: { userId: LOCAL_USER_ID, name: "Doing the thing" },
  });

  // The sample library, in the order it was saved (newest shows first in the app).
  const sparks: Array<{
    type: "url" | "note";
    title: string;
    description?: string;
    whySaved?: string;
    url?: string;
    mediaType: "text" | "link" | "video" | "image" | "embed";
    provider?: string;
    thumbnailUrl?: string;
    domain?: string;
    width?: number;
    height?: number;
    embedHtml?: string;
    status: string;
    onBoard: boolean;
  }> = [
      {
          "type": "url",
          "title": "why you want to do everything so you do nothing, and how to fix it",
          "description": "by Isabel Radford",
          "url": "https://www.youtube.com/watch?v=96TOwl10xZs",
          "mediaType": "video",
          "provider": "youtube",
          "thumbnailUrl": "https://i.ytimg.com/vi/96TOwl10xZs/hqdefault.jpg",
          "domain": "youtube",
          "width": 200,
          "height": 113,
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "how to stop living in your head and start living your life",
          "description": "by Isabel Radford",
          "url": "https://www.youtube.com/watch?v=OTYgGsNSGXo",
          "mediaType": "video",
          "provider": "youtube",
          "thumbnailUrl": "https://i.ytimg.com/vi/OTYgGsNSGXo/hqdefault.jpg",
          "domain": "youtube",
          "width": 200,
          "height": 113,
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "doing this 1 thing changed my life",
          "description": "by Lindsiann",
          "url": "https://www.youtube.com/watch?v=eiw7KYhWlrE",
          "mediaType": "video",
          "provider": "youtube",
          "thumbnailUrl": "https://i.ytimg.com/vi/eiw7KYhWlrE/hqdefault.jpg",
          "domain": "youtube",
          "width": 200,
          "height": 113,
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "the paradox of being ambitious but lazy",
          "description": "by Lindsiann",
          "url": "https://www.youtube.com/watch?v=pN_OGOPI92g",
          "mediaType": "video",
          "provider": "youtube",
          "thumbnailUrl": "https://i.ytimg.com/vi/pN_OGOPI92g/hqdefault.jpg",
          "domain": "youtube",
          "width": 200,
          "height": 113,
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "how to start doing something, instead of saying you will do something",
          "description": "discipline, consistency, the best time is now.",
          "url": "https://chicgirlmoment.substack.com/p/how-to-start-doing-something-instead",
          "mediaType": "image",
          "provider": "web",
          "thumbnailUrl": "https://substackcdn.com/image/fetch/$s_!lcVr!,w_1200,h_675,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe827c2b9-9011-44cf-b1c2-34f7613e5fcb_1600x900.png",
          "domain": "chicgirlmoment.substack.com",
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "the best piece of advice I've ever received",
          "description": "by Lindsiann",
          "url": "https://www.youtube.com/watch?v=Yrug2Fd9CWY",
          "mediaType": "video",
          "provider": "youtube",
          "thumbnailUrl": "https://i.ytimg.com/vi/Yrug2Fd9CWY/hqdefault.jpg",
          "domain": "youtube",
          "width": 200,
          "height": 113,
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "you didn't achieve your goal because you didn't want it enough",
          "description": "planning it in your journal and sharing it with others won't change anything if you don't take action.",
          "url": "https://chicgirlmoment.substack.com/p/you-didnt-achieve-your-goal-because",
          "mediaType": "image",
          "provider": "web",
          "thumbnailUrl": "https://substackcdn.com/image/fetch/$s_!-_5X!,w_1200,h_675,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2f021902-db18-4a12-a591-e056001f100f_1600x900.png",
          "domain": "chicgirlmoment.substack.com",
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "chase your fears // EP 104",
          "description": "by madeline argy",
          "url": "https://www.youtube.com/watch?v=MHHqHfgR4YU",
          "mediaType": "video",
          "provider": "youtube",
          "thumbnailUrl": "https://i.ytimg.com/vi/MHHqHfgR4YU/hqdefault.jpg",
          "domain": "youtube",
          "width": 200,
          "height": 113,
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "url",
          "title": "How to Become Dangerously Articulate — And Change Your Life",
          "description": "The woman who can say exactly what she means, precisely when it matters, in a way that moves people — that woman has an advantage that compounds for life.",
          "url": "https://richgirlacadmy.substack.com/p/how-to-become-dangerously-articulate",
          "mediaType": "image",
          "provider": "web",
          "thumbnailUrl": "https://substackcdn.com/image/fetch/$s_!nG98!,w_1200,h_675,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F6f35dfa5-3f43-4239-a1a6-60d2bbf4a42a_735x920.jpeg",
          "domain": "richgirlacadmy.substack.com",
          "status": "collected",
          "onBoard": true
      },
      {
          "type": "note",
          "title": "PREVIEW",
          "description": "Below shows how your library would look like after saving your Sparks",
          "mediaType": "text",
          "status": "inbox",
          "onBoard": false
      }
  ];

  // Give every spark its own timestamp, one second apart and ending just before now, so the
  // library order is deterministic: the last one listed (the PREVIEW note) is the newest and
  // shows first, and anything you capture afterwards lands above it.
  const start = Date.now() - sparks.length * 1000;
  for (const [i, { onBoard, ...spark }] of sparks.entries()) {
    await prisma.spark.create({
      data: {
        userId: LOCAL_USER_ID,
        ...spark,
        createdAt: new Date(start + i * 1000),
        collections: onBoard ? { create: [{ collectionId: board.id }] } : undefined,
      },
    });
  }
}

async function seedCanvas() {
  const sparks = await prisma.spark.findMany({ where: { userId: LOCAL_USER_ID } });
  const sparkIdByUrl: Record<string, string> = {};
  for (const spark of sparks) if (spark.url) sparkIdByUrl[spark.url] = spark.id;

  const canvas = await prisma.canvas.create({
    data: { userId: LOCAL_USER_ID, name: "Doing the thing" },
  });

  // The sample mindmap, exactly as it appears when the app is first opened.
  const n0 = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "text",
      text: "Why do I plan so much and start so little?",
      fontSize: 14,
      fontFamily: "sans",
      textColor: "ink",
      backgroundColor: "red",
      width: 225,
      height: 105,
      x: 400,
      y: 7,
    },
  });

  const n1 = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "spark",
      sparkId: sparkIdByUrl["https://www.youtube.com/watch?v=96TOwl10xZs"],
      detailLevel: "compact",
      x: 369,
      y: 190,
    },
  });

  const n2 = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "spark",
      sparkId: sparkIdByUrl["https://chicgirlmoment.substack.com/p/how-to-start-doing-something-instead"],
      detailLevel: "compact",
      x: 724,
      y: 506,
    },
  });

  const n3 = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "spark",
      sparkId: sparkIdByUrl["https://www.youtube.com/watch?v=Yrug2Fd9CWY"],
      detailLevel: "compact",
      x: 740,
      y: 868,
    },
  });

  const n4 = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "spark",
      sparkId: sparkIdByUrl["https://www.youtube.com/watch?v=OTYgGsNSGXo"],
      detailLevel: "compact",
      x: 55,
      y: 871,
    },
  });

  const n5 = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "text",
      text: "Seasons of Life: Commit to one path for now, knowing you can change later.\n\nMicro-actions: Use the 2-minute rule or scale down tasks to create momentum.\n\nTime Blocking: For those with neurodivergent brains, focus on completing weekly goals rather than strict daily schedules.\n\nEisenhower Matrix: Categorize tasks by urgency and importance.",
      fontSize: 14,
      fontFamily: "sans",
      textColor: "ink",
      backgroundColor: "amber",
      width: 632,
      height: 223,
      x: -112,
      y: 512,
    },
  });

  await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      kind: "text",
      text: "This is a sample mind map: \n\nAdd your sparks, your thoughts and make connections ",
      fontSize: 16,
      fontFamily: "sans",
      textColor: "ink",
      backgroundColor: "plain",
      width: 517,
      height: 174,
      x: -706,
      y: 138,
    },
  });

  const edges = [
    { from: n0, to: n1, sourceHandle: "bottom", targetHandle: "top" },
    { from: n2, to: n3, sourceHandle: "bottom", targetHandle: "top" },
    { from: n1, to: n5, sourceHandle: "bottom", targetHandle: "top" },
    { from: n4, to: n5, sourceHandle: "top", targetHandle: "bottom" },
    { from: n1, to: n2, sourceHandle: "bottom", targetHandle: "top" },
  ];
  for (const edge of edges) {
    await prisma.canvasEdge.create({
      data: {
        canvasId: canvas.id,
        fromNodeId: edge.from.id,
        toNodeId: edge.to.id,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      },
    });
  }
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
