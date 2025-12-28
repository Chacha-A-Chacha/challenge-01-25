-- Add file storage keys to StudentRegistration
ALTER TABLE "student_registrations" ADD COLUMN IF NOT EXISTS "paymentReceiptKey" TEXT;
ALTER TABLE "student_registrations" ADD COLUMN IF NOT EXISTS "paymentReceiptProvider" TEXT;

-- Add photo fields to Student
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photoKey" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photoProvider" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "photoUploadedAt" TIMESTAMP(3);
