// types/api.ts
import type {
  CourseStatus,
  WeekDay,
  AttendanceStatus,
  RequestStatus,
  RegistrationStatus,
} from "./enums";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface SuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiRequest<T = unknown> {
  body?: T;
  query?: Record<string, string | string[]>;
  params?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COURSE API TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface CourseCreateRequest {
  courseName: string;
  headTeacherEmail: string;
  headTeacherPassword: string;
}

export interface CourseUpdateRequest {
  name?: string;
  endDate?: Date;
  status?: CourseStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER API TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface TeacherCreateRequest {
  email: string;
  password: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS & SESSION API TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface ClassCreateRequest {
  name: string;
  capacity: number;
}

export interface SessionCreateRequest {
  day: WeekDay;
  startTime: string;
  endTime: string;
  capacity: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT IMPORT API TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface StudentImportRequest {
  file: File;
  classId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE API TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface AttendanceMarkRequest {
  qrData?: string;
  studentId?: string;
  sessionId: string;
  status?: AttendanceStatus;
  date?: Date;
}

export interface BulkAttendanceRequest {
  sessionId: string;
  attendanceRecords: Array<{
    studentId: string;
    status: AttendanceStatus;
  }>;
  date?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// REASSIGNMENT API TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface ReassignmentCreateRequest {
  studentId: string;
  fromSessionId: string;
  toSessionId: string;
  reason?: string;
}

export interface ReassignmentUpdateRequest {
  status: RequestStatus;
  teacherId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION API TYPES (NEW)
// ═══════════════════════════════════════════════════════════════════════════

/** Public course info for registration dropdown */
export interface CoursePublic {
  id: string;
  name: string;
  status: CourseStatus;
}

/** Public class info for registration - NEW */
export interface ClassPublic {
  id: string;
  name: string;
  capacity: number;
  saturdaySessions: number;
  sundaySessions: number;
  availableSpots: number;
  hasSaturdayAvailability: boolean;
  hasSundayAvailability: boolean;
}

/** Classes response for registration - NEW */
export interface ClassesResponse {
  courseId: string;
  courseName: string;
  classes: ClassPublic[];
}

/** Session with availability info for registration */
export interface SessionWithAvailability {
  id: string;
  classId: string;
  className: string;
  day: WeekDay;
  startTime: string; // Formatted time string "09:00"
  endTime: string; // Formatted time string "11:00"
  capacity: number;
  available: number;
  isFull: boolean;
}

/** Grouped sessions by day for registration form */
export interface CourseSessionsResponse {
  courseId: string;
  courseName: string;
  saturday: SessionWithAvailability[];
  sunday: SessionWithAvailability[];
}

/** Student registration submission request */
export interface StudentRegistrationRequest {
  // Course & Sessions
  courseId: string;
  classId: string;
  saturdaySessionId: string;
  sundaySessionId: string;

  // Personal Info
  surname: string;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;

  // Authentication
  password: string;

  // Payment
  paymentReceiptUrl: string;
  paymentReceiptNo: string;
}

/** Registration submission response */
export interface StudentRegistrationResponse {
  registrationId: string;
  email: string;
  courseName: string;
  saturdaySession: string; // Formatted: "9:00 AM - 11:00 AM"
  sundaySession: string; // Formatted: "11:30 AM - 1:30 PM"
  submittedAt: string;
}

/** Registration details for teacher review */
export interface RegistrationDetail {
  id: string;
  surname: string;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  courseName: string;
  saturdaySession: {
    id: string;
    time: string;
    className: string;
  };
  sundaySession: {
    id: string;
    time: string;
    className: string;
  };
  paymentReceiptUrl: string;
  paymentReceiptNo: string;
  status: RegistrationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

/** Rejection request */
export interface RejectRegistrationRequest {
  reason: string;
}

/** Bulk approval request */
export interface BulkApprovalRequest {
  registrationIds: string[];
}

/** Bulk approval response */
export interface BulkApprovalResponse {
  successful: Array<{
    registrationId: string;
    studentId: string;
    studentNumber: string;
  }>;
  failed: Array<{
    registrationId: string;
    error: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ATTENDANCE API TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Course-level attendance statistics */
export interface CourseAttendanceStats {
  courseId: string;
  courseName: string;
  courseStatus: CourseStatus;
  totalStudents: number;
  totalClasses: number;
  totalSessions: number;
  attendanceRecords: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  lastRecordedDate: string | null;
}

/** Class-level attendance statistics */
export interface ClassAttendanceStats {
  classId: string;
  className: string;
  totalStudents: number;
  saturdaySessionsCount: number;
  sundaySessionsCount: number;
  totalSessionsCount: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  lastRecordedDate: string | null;
}

/** Session info for filtering */
export interface SessionInfo {
  id: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  capacity: number;
  className: string;
}

/** Course detail with class breakdown */
export interface CourseAttendanceDetail {
  course: {
    id: string;
    name: string;
    status: CourseStatus;
    startDate: string;
    endDate: string | null;
  };
  overallStats: {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    wrongSessionCount: number;
  };
  classBreakdown: ClassAttendanceStats[];
  sessions: SessionInfo[];
}

/** Student attendance record for history */
export interface StudentAttendanceRecord {
  id: string;
  date: string;
  day: WeekDay;
  sessionId: string;
  sessionName: string;
  sessionTime: string;
  status: AttendanceStatus;
  scanTime: string | null;
  markedBy: string | null;
  markedByName: string | null;
}

/** Student info for attendance tracker */
export interface StudentAttendanceInfo {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  className: string;
  classId: string;
  saturdaySession: {
    id: string;
    time: string;
    className: string;
  };
  sundaySession: {
    id: string;
    time: string;
    className: string;
  };
}

/** Student attendance history response */
export interface StudentAttendanceHistory {
  student: StudentAttendanceInfo;
  attendanceRecords: StudentAttendanceRecord[];
  stats: {
    totalClassDays: number;
    presentDays: number;
    absentDays: number;
    wrongSessionDays: number;
    attendanceRate: number;
    saturdayAttendanceRate: number;
    sundayAttendanceRate: number;
  };
}

/** Student search result */
export interface StudentSearchResult {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  surname: string;
  className: string;
  email: string;
}

/** Attendance export filters */
export interface AttendanceExportFilters {
  courseId?: string;
  classId?: string;
  sessionId?: string;
  startDate: string;
  endDate: string;
  status?: AttendanceStatus;
  format?: "csv" | "json";
}

/** Attendance export row */
export interface AttendanceExportRow {
  date: string;
  studentNumber: string;
  studentName: string;
  className: string;
  courseName: string;
  sessionDay: string;
  sessionTime: string;
  status: string;
  scanTime: string;
  markedBy: string;
}
