-- CreateTable
CREATE TABLE "WeeklySuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT,
    "data" JSONB NOT NULL,

    CONSTRAINT "WeeklySuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklySuggestion_userId_generatedAt_idx" ON "WeeklySuggestion"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "WeeklySuggestion" ADD CONSTRAINT "WeeklySuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
