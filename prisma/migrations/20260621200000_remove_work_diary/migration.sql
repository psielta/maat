-- Remove the work diary feature; the app is now exclusively Kanban boards.
DROP TABLE "work_diary_entry_shares";

DROP TABLE "work_diary_entries";

DROP TYPE "WorkDiaryShareRole";
