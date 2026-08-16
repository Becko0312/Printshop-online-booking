-- Standalone print agent auth: a per-merchant bearer token.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "agentToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_agentToken_key" ON "User"("agentToken");
