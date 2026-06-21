CREATE TYPE "WorkDiaryShareRole" AS ENUM ('EDITOR', 'VIEWER');

CREATE TABLE "work_diary_entries" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "author_id" TEXT NOT NULL,

  CONSTRAINT "work_diary_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_diary_entry_shares" (
  "id" TEXT NOT NULL,
  "role" "WorkDiaryShareRole" NOT NULL DEFAULT 'VIEWER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "entry_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,

  CONSTRAINT "work_diary_entry_shares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_diary_entries_author_id_updated_at_idx" ON "work_diary_entries"("author_id", "updated_at");
CREATE UNIQUE INDEX "work_diary_entry_shares_entry_id_user_id_key" ON "work_diary_entry_shares"("entry_id", "user_id");
CREATE INDEX "work_diary_entry_shares_user_id_idx" ON "work_diary_entry_shares"("user_id");

ALTER TABLE "work_diary_entries"
  ADD CONSTRAINT "work_diary_entries_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_diary_entry_shares"
  ADD CONSTRAINT "work_diary_entry_shares_entry_id_fkey"
  FOREIGN KEY ("entry_id") REFERENCES "work_diary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_diary_entry_shares"
  ADD CONSTRAINT "work_diary_entry_shares_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
