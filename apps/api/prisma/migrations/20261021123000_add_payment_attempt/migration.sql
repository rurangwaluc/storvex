-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "checkoutReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "failureCode" TEXT,
    "verificationDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_checkoutReference_key"
ON "PaymentAttempt"("checkoutReference");

-- CreateIndex
CREATE INDEX "PaymentAttempt_paymentId_status_idx"
ON "PaymentAttempt"("paymentId", "status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_status_idx"
ON "PaymentAttempt"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerTransactionId_key"
ON "PaymentAttempt"("provider", "providerTransactionId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_paymentId_fkey"
FOREIGN KEY ("paymentId")
REFERENCES "Payment"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
