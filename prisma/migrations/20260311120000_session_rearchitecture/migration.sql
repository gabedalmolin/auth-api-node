-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'COMPROMISED');

-- CreateEnum
CREATE TYPE "RefreshTokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'REUSED');

-- AlterTable
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "compromisedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Session" (
  "id",
  "userId",
  "status",
  "createdAt",
  "updatedAt",
  "lastSeenAt",
  "userAgent",
  "ipAddress",
  "revokedAt"
)
SELECT
  "id",
  "userId",
  CASE WHEN "revoked" THEN 'REVOKED'::"SessionStatus" ELSE 'ACTIVE'::"SessionStatus" END,
  "createdAt",
  CURRENT_TIMESTAMP,
  "lastUsedAt",
  "userAgent",
  "ipAddress",
  CASE WHEN "revoked" THEN COALESCE("lastUsedAt", "createdAt") ELSE NULL END
FROM "RefreshToken";

-- AlterTable
ALTER TABLE "RefreshToken"
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "status" "RefreshTokenStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "usedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "parentTokenId" TEXT,
ADD COLUMN     "replacedByTokenId" TEXT;

UPDATE "RefreshToken"
SET
  "sessionId" = "id",
  "status" = CASE WHEN "revoked" THEN 'REVOKED'::"RefreshTokenStatus" ELSE 'ACTIVE'::"RefreshTokenStatus" END,
  "usedAt" = "lastUsedAt",
  "revokedAt" = CASE WHEN "revoked" THEN COALESCE("lastUsedAt", "createdAt") ELSE NULL END;

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "sessionId" SET NOT NULL;

-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- AlterTable
ALTER TABLE "RefreshToken"
DROP COLUMN "userId",
DROP COLUMN "revoked",
DROP COLUMN "lastUsedAt",
DROP COLUMN "userAgent",
DROP COLUMN "ipAddress";

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");

-- CreateIndex
CREATE INDEX "RefreshToken_status_idx" ON "RefreshToken"("status");

-- CreateIndex
CREATE INDEX "RefreshToken_sessionId_status_idx" ON "RefreshToken"("sessionId", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
