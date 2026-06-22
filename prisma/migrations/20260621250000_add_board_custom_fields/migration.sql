-- CreateEnum
CREATE TYPE "BoardCustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'CHECKBOX', 'DATE', 'DROPDOWN');

-- CreateTable
CREATE TABLE "board_custom_fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BoardCustomFieldType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "show_on_front" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "board_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_custom_field_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "field_id" TEXT NOT NULL,

    CONSTRAINT "board_custom_field_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_card_custom_field_values" (
    "id" TEXT NOT NULL,
    "text_value" TEXT,
    "number_value" DOUBLE PRECISION,
    "date_value" DATE,
    "bool_value" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "card_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "option_id" TEXT,

    CONSTRAINT "board_card_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_custom_fields_board_id_idx" ON "board_custom_fields"("board_id");

-- CreateIndex
CREATE INDEX "board_custom_field_options_field_id_idx" ON "board_custom_field_options"("field_id");

-- CreateIndex
CREATE INDEX "board_card_custom_field_values_card_id_idx" ON "board_card_custom_field_values"("card_id");

-- CreateIndex
CREATE INDEX "board_card_custom_field_values_field_id_idx" ON "board_card_custom_field_values"("field_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_card_custom_field_values_card_id_field_id_key" ON "board_card_custom_field_values"("card_id", "field_id");

-- AddForeignKey
ALTER TABLE "board_custom_fields" ADD CONSTRAINT "board_custom_fields_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_custom_field_options" ADD CONSTRAINT "board_custom_field_options_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "board_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_custom_field_values" ADD CONSTRAINT "board_card_custom_field_values_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "board_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_custom_field_values" ADD CONSTRAINT "board_card_custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "board_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_card_custom_field_values" ADD CONSTRAINT "board_card_custom_field_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "board_custom_field_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;