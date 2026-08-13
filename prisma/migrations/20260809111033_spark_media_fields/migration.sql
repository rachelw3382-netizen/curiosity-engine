-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Spark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "description" TEXT,
    "whySaved" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inbox',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaType" TEXT NOT NULL DEFAULT 'text',
    "provider" TEXT,
    "thumbnailUrl" TEXT,
    "embedHtml" TEXT,
    "domain" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    CONSTRAINT "Spark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Spark" ("createdAt", "description", "id", "status", "title", "type", "url", "userId", "whySaved") SELECT "createdAt", "description", "id", "status", "title", "type", "url", "userId", "whySaved" FROM "Spark";
DROP TABLE "Spark";
ALTER TABLE "new_Spark" RENAME TO "Spark";
CREATE INDEX "Spark_userId_idx" ON "Spark"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
