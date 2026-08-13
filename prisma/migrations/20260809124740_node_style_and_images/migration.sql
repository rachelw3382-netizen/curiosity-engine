-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CanvasNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sparkId" TEXT,
    "text" TEXT,
    "imageUrl" TEXT,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "detailLevel" TEXT NOT NULL DEFAULT 'compact',
    "fontSize" TEXT NOT NULL DEFAULT 'base',
    "fontFamily" TEXT NOT NULL DEFAULT 'sans',
    "textColor" TEXT NOT NULL DEFAULT 'ink',
    "backgroundColor" TEXT NOT NULL DEFAULT 'amber',
    CONSTRAINT "CanvasNode_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "Canvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasNode_sparkId_fkey" FOREIGN KEY ("sparkId") REFERENCES "Spark" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CanvasNode" ("canvasId", "detailLevel", "id", "kind", "sparkId", "text", "x", "y") SELECT "canvasId", "detailLevel", "id", "kind", "sparkId", "text", "x", "y" FROM "CanvasNode";
DROP TABLE "CanvasNode";
ALTER TABLE "new_CanvasNode" RENAME TO "CanvasNode";
CREATE INDEX "CanvasNode_canvasId_idx" ON "CanvasNode"("canvasId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
