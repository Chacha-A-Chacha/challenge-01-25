// types/api.ts
import type { CourseStatus, WeekDay, AttendanceStatus, RequestStatus } from './enums'
// import type { Student } from './database'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface SuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiRequest<T = unknown> {
  body?: T
  query?: Record<string, string | string[]>
  params?: Record<string, string>
}

// Specific API request types
export interface CourseCreateRequest {
  courseName: string
  headTeacherEmail: string
  headTeacherPassword: string
}

export interface CourseUpdateRequest {
  name?: string
  endDate?: Date
  status?: CourseStatus
}

export interface TeacherCreateRequest {
  email: string
  password: string
}

export interface ClassCreateRequest {
  name: string
  capacity: number
}

export interface SessionCreateRequest {
  day: WeekDay
  startTime: string
  endTime: string
  capacity: number
}

export interface StudentImportRequest {
  file: File
  classId: string
}

export interface AttendanceMarkRequest {
  qrData?: string
  studentId?: string
  sessionId: string
  status?: AttendanceStatus
  date?: Date
}

export interface BulkAttendanceRequest {
  sessionId: string
  attendanceRecords: Array<{
    studentId: string
    status: AttendanceStatus
  }>
  date?: Date
}

export interface ReassignmentCreateRequest {
  studentId: string
  fromSessionId: string
  toSessionId: string
  reason?: string
}

export interface ReassignmentUpdateRequest {
  status: RequestStatus
  teacherId?: string
} 