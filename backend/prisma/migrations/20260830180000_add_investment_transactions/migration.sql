CREATE TABLE "InvestmentTransaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "units" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "investmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvestmentTransaction_investmentId_date_idx" ON "InvestmentTransaction"("investmentId", "date");

ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_investmentId_fkey"
  FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
