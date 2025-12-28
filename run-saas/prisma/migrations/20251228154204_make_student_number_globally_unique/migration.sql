-- DropIndex (remove composite unique constraint)
DROP INDEX "students_studentNumber_classId_key";

-- CreateIndex (add global unique constraint on studentNumber)
CREATE UNIQUE INDEX "students_studentNumber_key" ON "students"("studentNumber");
