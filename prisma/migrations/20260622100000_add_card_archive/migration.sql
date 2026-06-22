-- AlterTable
ALTER TABLE "board_cards" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "board_cards_list_id_archived_at_idx" ON "board_cards"("list_id", "archived_at");