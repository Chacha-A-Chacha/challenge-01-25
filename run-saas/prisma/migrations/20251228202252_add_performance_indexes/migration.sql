-- Add performance indexes for frequently queried fields
-- These indexes significantly improve query performance for common operations

-- ============================================================================
-- TEACHER INDEXES
-- ============================================================================
CREATE INDEX "teachers_courseId_idx" ON "teachers"("courseId");
CREATE INDEX "teachers_isDeleted_idx" ON "teachers"("isDeleted");

-- ============================================================================
-- CLASS INDEXES
-- ============================================================================
CREATE INDEX "classes_courseId_idx" ON "classes"("courseId");

-- ============================================================================
-- SESSION INDEXES
-- ============================================================================
CREATE INDEX "sessions_classId_idx" ON "sessions"("classId");
CREATE INDEX "sessions_classId_day_idx" ON "sessions"("classId", "day");

-- ============================================================================
-- STUDENT INDEXES
-- ============================================================================
CREATE INDEX "students_classId_idx" ON "students"("classId");
CREATE INDEX "students_isDeleted_idx" ON "students"("isDeleted");
CREATE INDEX "students_isDeleted_classId_idx" ON "students"("isDeleted", "classId");

-- ============================================================================
-- STUDENT REGISTRATION INDEXES
-- ============================================================================
CREATE INDEX "student_registrations_status_idx" ON "student_registrations"("status");
CREATE INDEX "student_registrations_courseId_idx" ON "student_registrations"("courseId");
CREATE INDEX "student_registrations_status_courseId_idx" ON "student_registrations"("status", "courseId");

-- ============================================================================
-- ATTENDANCE INDEXES (Critical for performance)
-- ============================================================================
CREATE INDEX "attendances_date_idx" ON "attendances"("date");
CREATE INDEX "attendances_status_idx" ON "attendances"("status");
CREATE INDEX "attendances_sessionId_idx" ON "attendances"("sessionId");
CREATE INDEX "attendances_date_sessionId_idx" ON "attendances"("date", "sessionId");
CREATE INDEX "attendances_studentId_date_idx" ON "attendances"("studentId", "date");

-- ============================================================================
-- REASSIGNMENT REQUEST INDEXES
-- ============================================================================
CREATE INDEX "reassignment_requests_status_idx" ON "reassignment_requests"("status");
CREATE INDEX "reassignment_requests_studentId_idx" ON "reassignment_requests"("studentId");
