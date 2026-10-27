-- CreateTable
CREATE TABLE "StorvexAccount" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorvexAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorvexAccountOtpChallenge" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorvexAccountOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorvexAccountSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorvexAccountSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorvexAccount_email_key" ON "StorvexAccount"("email");

-- CreateIndex
CREATE INDEX "StorvexAccount_status_idx" ON "StorvexAccount"("status");

-- CreateIndex
CREATE INDEX "StorvexAccountOtpChallenge_accountId_createdAt_idx" ON "StorvexAccountOtpChallenge"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "StorvexAccountOtpChallenge_expiresAt_idx" ON "StorvexAccountOtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorvexAccountSession_tokenId_key" ON "StorvexAccountSession"("tokenId");

-- CreateIndex
CREATE INDEX "StorvexAccountSession_accountId_isRevoked_idx" ON "StorvexAccountSession"("accountId", "isRevoked");

-- CreateIndex
CREATE INDEX "StorvexAccountSession_expiresAt_idx" ON "StorvexAccountSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "StorvexAccountOtpChallenge" ADD CONSTRAINT "StorvexAccountOtpChallenge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StorvexAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorvexAccountSession" ADD CONSTRAINT "StorvexAccountSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StorvexAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
