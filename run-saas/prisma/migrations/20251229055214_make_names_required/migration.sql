/*
  Warnings:

  - Made the column `firstName` on table `admins` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `admins` required. This step will fail if there are existing NULL values in that column.
  - Made the column `firstName` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `teachers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "admins" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;

-- AlterTable
ALTER TABLE "teachers" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;
