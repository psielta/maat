-- CreateTable
CREATE TABLE "board_labels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "board_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_card_labels" (
    "card_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "board_card_labels_pkey" PRIMARY KEY ("card_id","label_id")
);

-- CreateIndex
CREATE INDEX "board_labels_board_id_idx" ON "board_labels"("board_id");

-- CreateIndex
CREATE INDEX "board_card_labels_label_id_idx" ON "board_card_labels"("label_id");

-- AddForeignKey
ALTER TABLE "board_labels" ADD CONSTRAINT "board_labels_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_labels" ADD CONSTRAINT "board_card_labels_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "board_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_labels" ADD CONSTRAINT "board_card_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "board_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;