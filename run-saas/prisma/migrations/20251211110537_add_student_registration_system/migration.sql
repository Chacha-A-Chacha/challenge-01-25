/*
  Warnings:

  - Added the required column `passwordHash` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable: Add passwordHash column with a temporary default, then remove the default
ALTER TABLE "students" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2a$10$placeholder.hash.for.existing.students.only';

-- Remove the default so new students must provide a password
ALTER TABLE "students" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- CreateTable
CREATE TABLE "student_registrations" (
    "id" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "courseId" TEXT NOT NULL,
    "saturdaySessionId" TEXT NOT NULL,
    "sundaySessionId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "paymentReceiptUrl" TEXT NOT NULL,
    "paymentReceiptNo" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_registrations_email_key" ON "student_registrations"("email");

-- AddForeignKey
ALTER TABLE "student_registrations" ADD CONSTRAINT "student_registrations_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_registrations" ADD CONSTRAINT "student_registrations_saturdaySessionId_fkey" FOREIGN KEY ("saturdaySessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_registrations" ADD CONSTRAINT "student_registrations_sundaySessionId_fkey" FOREIGN KEY ("sundaySessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_registrations" ADD CONSTRAINT "student_registrations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
