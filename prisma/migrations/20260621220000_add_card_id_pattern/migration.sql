-- AlterTable
ALTER TABLE "boards" ADD COLUMN "card_id_pattern" TEXT;

-- AlterTable
ALTER TABLE "board_cards" ADD COLUMN "display_id" TEXT;

-- CreateTable
CREATE TABLE "board_card_id_sequences" (
    "id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL DEFAULT '',
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "board_card_id_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_cards_display_id_idx" ON "board_cards"("display_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_card_id_sequences_board_id_date_key_key" ON "board_card_id_sequences"("board_id", "date_key");

-- AddForeignKey
ALTER TABLE "board_card_id_sequences" ADD CONSTRAINT "board_card_id_sequences_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;