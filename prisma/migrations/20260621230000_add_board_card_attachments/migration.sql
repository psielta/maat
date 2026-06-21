-- CreateEnum
CREATE TYPE "BoardAttachmentStatus" AS ENUM ('PENDING', 'READY');

-- CreateEnum
CREATE TYPE "BoardAttachmentScope" AS ENUM ('CARD', 'COMMENT');

-- CreateTable
CREATE TABLE "board_card_attachments" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scope" "BoardAttachmentScope" NOT NULL DEFAULT 'CARD',
    "status" "BoardAttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "card_id" TEXT NOT NULL,
    "comment_id" TEXT,
    "uploaded_by_id" TEXT NOT NULL,

    CONSTRAINT "board_card_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_card_attachments_storage_key_key" ON "board_card_attachments"("storage_key");

-- CreateIndex
CREATE INDEX "board_card_attachments_card_id_created_at_idx" ON "board_card_attachments"("card_id", "created_at");

-- CreateIndex
CREATE INDEX "board_card_attachments_comment_id_idx" ON "board_card_attachments"("comment_id");

-- AddForeignKey
ALTER TABLE "board_card_attachments" ADD CONSTRAINT "board_card_attachments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "board_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_attachments" ADD CONSTRAINT "board_card_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "board_card_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_attachments" ADD CONSTRAINT "board_card_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;