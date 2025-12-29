/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `student_registrations` table. All the data in the column will be lost.
  - Added the required column `password` to the `student_registrations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_courseId_fkey";

-- DropForeignKey
ALTER TABLE "reassignment_requests" DROP CONSTRAINT "reassignment_requests_fromSessionId_fkey";

-- DropForeignKey
ALTER TABLE "reassignment_requests" DROP CONSTRAINT "reassignment_requests_studentId_fkey";

-- DropForeignKey
ALTER TABLE "reassignment_requests" DROP CONSTRAINT "reassignment_requests_toSessionId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_classId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_saturdaySessionId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_sundaySessionId_fkey";

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- AlterTable
ALTER TABLE "student_registrations" DROP COLUMN "passwordHash",
ADD COLUMN     "password" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_saturdaySessionId_fkey" FOREIGN KEY ("saturdaySessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_sundaySessionId_fkey" FOREIGN KEY ("sundaySessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reassignment_requests" ADD CONSTRAINT "reassignment_requests_fromSessionId_fkey" FOREIGN KEY ("fromSessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reassignment_requests" ADD CONSTRAINT "reassignment_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reassignment_requests" ADD CONSTRAINT "reassignment_requests_toSessionId_fkey" FOREIGN KEY ("toSessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
