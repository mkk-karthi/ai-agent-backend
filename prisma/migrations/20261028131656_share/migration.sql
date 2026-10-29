/*
  Warnings:

  - You are about to drop the column `createdBy` on the `api_tokens` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `api_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConversationShareType" AS ENUM ('PUBLIC', 'SPECIFIC_USER', 'RESTRICTED');

-- DropIndex
DROP INDEX "conversation_messages_userId_idx";

-- DropIndex
DROP INDEX "conversations_name_userId_idx";

-- AlterTable
ALTER TABLE "api_tokens" DROP COLUMN "createdBy",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "conversation_messages" ALTER COLUMN "toolCalls" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "conversation_share" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "type" "ConversationShareType" NOT NULL DEFAULT 'RESTRICTED',
    "userMails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_share_conversationId_key" ON "conversation_share"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_share_conversationId_idx" ON "conversation_share"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_share_userMails_type_idx" ON "conversation_share"("userMails", "type") WHERE ("type" = 'SPECIFIC_USER');

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_userId_idx" ON "conversation_messages"("conversationId", "userId") WHERE ("status" = 'ACTIVE');

-- CreateIndex
CREATE INDEX "conversations_name_userId_idx" ON "conversations"("name", "userId") WHERE ("status" = 'ACTIVE');

-- CreateIndex
CREATE INDEX "conversations_isPinned_userId_idx" ON "conversations"("isPinned", "userId") WHERE ("status" = 'ACTIVE');

-- AddForeignKey
ALTER TABLE "conversation_share" ADD CONSTRAINT "conversation_share_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
