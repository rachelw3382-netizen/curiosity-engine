/*
  Warnings:

  - You are about to drop the `Reflection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrailSource` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Reflection";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Trail";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TrailSource";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Canvas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sparkId" TEXT,
    "text" TEXT,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    CONSTRAINT "CanvasNode_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "Canvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasNode_sparkId_fkey" FOREIGN KEY ("sparkId") REFERENCES "Spark" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    CONSTRAINT "CanvasEdge_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "Canvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "CanvasNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "CanvasNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Canvas_userId_idx" ON "Canvas"("userId");

-- CreateIndex
CREATE INDEX "CanvasNode_canvasId_idx" ON "CanvasNode"("canvasId");

-- CreateIndex
CREATE INDEX "CanvasEdge_canvasId_idx" ON "CanvasEdge"("canvasId");
