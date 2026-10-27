-- Add an independent retail EMAIL login challenge table.
-- Existing signup OTP and password login remain unchanged.
CREATE TABLE "RetailEmailLoginChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetailEmailLoginChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RetailEmailLoginChallenge_userId_consumedAt_idx"
ON "RetailEmailLoginChallenge"("userId", "consumedAt");

CREATE INDEX "RetailEmailLoginChallenge_email_createdAt_idx"
ON "RetailEmailLoginChallenge"("email", "createdAt");

CREATE INDEX "RetailEmailLoginChallenge_expiresAt_idx"
ON "RetailEmailLoginChallenge"("expiresAt");

ALTER TABLE "RetailEmailLoginChallenge"
ADD CONSTRAINT "RetailEmailLoginChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
