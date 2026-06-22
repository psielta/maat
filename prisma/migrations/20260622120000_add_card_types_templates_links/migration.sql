-- CreateEnum
CREATE TYPE "BoardCardType" AS ENUM ('DEFAULT', 'TASK', 'BUG', 'FEATURE', 'EPIC');

-- AlterTable
ALTER TABLE "board_cards" ADD COLUMN "card_type" "BoardCardType" NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE "board_cards" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "board_cards_list_id_is_template_idx" ON "board_cards"("list_id", "is_template");

-- CreateTable
CREATE TABLE "board_card_links" (
    "id" TEXT NOT NULL,
    "card_a_id" TEXT NOT NULL,
    "card_b_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "board_card_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_card_links_card_b_id_idx" ON "board_card_links"("card_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_card_links_card_a_id_card_b_id_key" ON "board_card_links"("card_a_id", "card_b_id");

-- AddForeignKey
ALTER TABLE "board_card_links" ADD CONSTRAINT "board_card_links_card_a_id_fkey" FOREIGN KEY ("card_a_id") REFERENCES "board_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_links" ADD CONSTRAINT "board_card_links_card_b_id_fkey" FOREIGN KEY ("card_b_id") REFERENCES "board_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_links" ADD CONSTRAINT "board_card_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;