-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LearningPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT,
    "genreId" TEXT,
    "pattern" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL,
    "examples" TEXT,
    "strongCount" INTEGER NOT NULL DEFAULT 0,
    "weakCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningPattern_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LearningPattern_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LearningPattern" ("accountId", "createdAt", "examples", "genreId", "id", "pattern", "source", "updatedAt", "weight") SELECT "accountId", "createdAt", "examples", "genreId", "id", "pattern", "source", "updatedAt", "weight" FROM "LearningPattern";
DROP TABLE "LearningPattern";
ALTER TABLE "new_LearningPattern" RENAME TO "LearningPattern";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
