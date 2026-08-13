-- Catch-up migration: brings the database in line with schema changes that
-- were previously applied via `prisma db push` but never recorded as a
-- migration. Covers, in commit order:
--   * merchant/admin roles          (Role enum + User.role)
--   * merchant printer ownership    (Printer.merchantId + index + FK)
--   * BigInt PrintNode job ids      (PrintJob.printNodeJobId Int -> BigInt)
--   * promo code redemption         (PromoCode + PromoRedemption tables)
--   * Bonum Gateway wallet top-ups  (WalletTx.bonumInvoiceId/bonumTransactionId)

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "Printer" ADD COLUMN "merchantId" TEXT;

-- AlterTable
ALTER TABLE "PrintJob" ALTER COLUMN "printNodeJobId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "WalletTx" ADD COLUMN "bonumInvoiceId" TEXT,
ADD COLUMN "bonumTransactionId" TEXT;

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Printer_merchantId_idx" ON "Printer"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTx_bonumInvoiceId_key" ON "WalletTx"("bonumInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoRedemption_userId_idx" ON "PromoRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_key" ON "PromoRedemption"("promoCodeId", "userId");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
