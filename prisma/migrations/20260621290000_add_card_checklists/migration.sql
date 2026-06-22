-- CreateTable
CREATE TABLE "board_card_checklists" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Checklist',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "card_id" TEXT NOT NULL,

    CONSTRAINT "board_card_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_card_checklist_items" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "checklist_id" TEXT NOT NULL,

    CONSTRAINT "board_card_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_card_checklists_card_id_idx" ON "board_card_checklists"("card_id");

-- CreateIndex
CREATE INDEX "board_card_checklist_items_checklist_id_idx" ON "board_card_checklist_items"("checklist_id");

-- AddForeignKey
ALTER TABLE "board_card_checklists" ADD CONSTRAINT "board_card_checklists_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "board_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_checklist_items" ADD CONSTRAINT "board_card_checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "board_card_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;