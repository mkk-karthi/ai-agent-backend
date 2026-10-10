/*
  Warnings:

  - You are about to drop the column `outputTokens` on the `conversation_messages` table. All the data in the column will be lost.
  - You are about to drop the column `promptTokens` on the `conversation_messages` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `conversation_messages` table. All the data in the column will be lost.
  - The `status` column on the `conversation_messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `totalTokens` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `inputTokenLimit` on the `models` table. All the data in the column will be lost.
  - You are about to drop the column `outputTokenLimit` on the `models` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- AlterEnum
ALTER TYPE "AiRole" ADD VALUE 'TOOL';

-- AlterTable
ALTER TABLE "conversation_messages" DROP COLUMN "outputTokens",
DROP COLUMN "promptTokens",
DROP COLUMN "updatedAt",
ADD COLUMN     "toolCalls" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "totalTokens";

-- AlterTable
ALTER TABLE "models" DROP COLUMN "inputTokenLimit",
DROP COLUMN "outputTokenLimit";

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "baseUrl" TEXT,
ADD COLUMN     "headers" JSONB,
ADD COLUMN     "token" TEXT;

-- CreateTable
CREATE TABLE "token_usage" (
    "id" SERIAL NOT NULL,
    "conversationMessageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "modelId" INTEGER NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_usage_conversationMessageId_key" ON "token_usage"("conversationMessageId");

-- CreateIndex
CREATE INDEX "token_usage_userId_conversationMessageId_idx" ON "token_usage"("userId", "conversationMessageId");

-- AddForeignKey
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_conversationMessageId_fkey" FOREIGN KEY ("conversationMessageId") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
