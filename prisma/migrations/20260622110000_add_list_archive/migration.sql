-- AlterTable
ALTER TABLE "board_lists" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "board_lists_board_id_archived_at_idx" ON "board_lists"("board_id", "archived_at");