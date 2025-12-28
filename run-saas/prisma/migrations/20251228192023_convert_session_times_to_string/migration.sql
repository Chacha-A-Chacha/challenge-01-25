-- Convert Session times from DateTime to String (HH:MM:SS format)
-- This migration preserves existing time data by extracting the time portion

-- Step 1: Add new temporary columns
ALTER TABLE "sessions" ADD COLUMN "startTime_new" TEXT;
ALTER TABLE "sessions" ADD COLUMN "endTime_new" TEXT;

-- Step 2: Convert existing DateTime to time string (HH:MM:SS format)
UPDATE "sessions"
SET "startTime_new" = TO_CHAR("startTime" AT TIME ZONE 'UTC', 'HH24:MI:SS');

UPDATE "sessions"
SET "endTime_new" = TO_CHAR("endTime" AT TIME ZONE 'UTC', 'HH24:MI:SS');

-- Step 3: Drop old DateTime columns
ALTER TABLE "sessions" DROP COLUMN "startTime";
ALTER TABLE "sessions" DROP COLUMN "endTime";

-- Step 4: Rename new columns to original names
ALTER TABLE "sessions" RENAME COLUMN "startTime_new" TO "startTime";
ALTER TABLE "sessions" RENAME COLUMN "endTime_new" TO "endTime";

-- Step 5: Make columns NOT NULL (all existing data already migrated)
ALTER TABLE "sessions" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "sessions" ALTER COLUMN "endTime" SET NOT NULL;
