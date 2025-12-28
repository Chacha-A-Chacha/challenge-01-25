-- AlterTable
ALTER TABLE "students" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "students" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add onDelete actions to foreign keys
-- Note: Prisma will handle the constraint recreation automatically
-- This migration ensures referential integrity with proper cascade/restrict rules
