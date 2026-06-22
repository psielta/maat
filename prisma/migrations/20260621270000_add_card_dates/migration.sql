-- AlterTable
ALTER TABLE "board_cards" ADD COLUMN "start_date" DATE,
ADD COLUMN "due_at" TIMESTAMP(3),
ADD COLUMN "due_complete" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "board_cards_due_at_idx" ON "board_cards"("due_at");