-- AlterTable
ALTER TABLE "teachers" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "teachers" ADD COLUMN "deletedAt" TIMESTAMP(3);
