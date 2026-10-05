/*
  Warnings:

  - You are about to drop the column `coversationId` on the `conversation_messages` table. All the data in the column will be lost.
  - You are about to drop the column `updateddAt` on the `conversation_messages` table. All the data in the column will be lost.
  - You are about to drop the column `modelId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `conversations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[modelKey,providerId]` on the table `models` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversationId` to the `conversation_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelId` to the `conversation_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `conversation_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `conversation_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `conversations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_modelId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_providerId_fkey";

-- DropIndex
DROP INDEX "conversation_messages_coversationId_idx";

-- DropIndex
DROP INDEX "conversation_messages_coversationId_key";

-- DropIndex
DROP INDEX "conversations_modelId_userId_idx";

-- DropIndex
DROP INDEX "models_modelKey_idx";

-- DropIndex
DROP INDEX "models_modelName_providerId_idx";

-- AlterTable
ALTER TABLE "conversation_messages" DROP COLUMN "coversationId",
DROP COLUMN "updateddAt",
ADD COLUMN     "conversationId" UUID NOT NULL,
ADD COLUMN     "modelId" INTEGER NOT NULL,
ADD COLUMN     "parentId" UUID,
ADD COLUMN     "providerId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "modelId",
DROP COLUMN "providerId",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "models_modelKey_providerId_key" ON "models"("modelKey", "providerId");

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
