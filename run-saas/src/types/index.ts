// types/index.ts

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export enum TeacherRole {
  HEAD = 'HEAD',
  ADDITIONAL = 'ADDITIONAL'
}

export enum CourseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED'
}

export enum WeekDay {
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  WRONG_SESSION = 'WRONG_SESSION'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED'
}

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// ============================================================================
// DATABASE ENTITIES
// ============================================================================

export interface Admin {
  id: string
  email: string
  password: string
  createdAt: Date
}

export interface Course {
  id: string
  name: string
  headTeacherId: string
  endDate?: Date
  status: CourseStatus
  createdAt: Date
  
  // Relations
  headTeacher?: Teacher
  teachers?: Teacher[]
  classes?: Class[]
}

export interface Teacher {
  id: string
  email: string
  password: string
  courseId?: string
  role: TeacherRole
  createdAt: Date
  
  // Relations
  course?: Course
  headCourse?: Course
  attendanceRecords?: Attendance[]
  approvedRequests?: ReassignmentRequest[]
}

export interface Class {
  id: string
  name: string
  capacity: number
  courseId: string
  createdAt: Date
  
  // Relations
  course?: Course
  sessions?: Session[]
  students?: Student[]
}

export interface Session {
  id: string
  classId: string
  day: WeekDay
  startTime: string // "HH:MM" format
  endTime: string   // "HH:MM" format
  capacity: number
  createdAt: Date
  
  // Relations
  class?: Class
  students?: Student[]
  attendances?: Attendance[]
  fromRequests?: ReassignmentRequest[]
  toRequests?: ReassignmentRequest[]
}

export interface Student {
  id: string
  uuid: string
  studentNumber: string
  firstName: string
  lastName?: string
  email: string
  phoneNumber?: string
  classId: string
  createdAt: Date
  
  // Relations
  class?: Class
  sessions?: Session[]
  attendances?: Attendance[]
  reassignmentRequests?: ReassignmentRequest[]
}

export interface Attendance {
  id: string
  studentId: string
  sessionId: string
  date: Date
  status: AttendanceStatus
  scanTime?: Date
  teacherId?: string
  
  // Relations
  student?: Student
  session?: Session
  markedBy?: Teacher
}

export interface ReassignmentRequest {
  id: string
  studentId: string
  fromSessionId: string
  toSessionId: string
  status: RequestStatus
  requestedAt: Date
  teacherId?: string
  
  // Relations
  student?: Student
  fromSession?: Session
  toSession?: Session
  approvedBy?: Teacher
}

// ============================================================================
// QR CODE TYPES
// ============================================================================

export interface QRCodeData {
  uuid: string
  student_id: string
}

export interface QRScanResult {
  success: boolean
  attendance?: Attendance
  message: string
  status?: AttendanceStatus
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface AuthUser {
  id: string
  email?: string
  role: UserRole
  studentNumber?: string
  uuid?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  courseId?: string
  classId?: string
  teacherRole?: TeacherRole
}

export interface LoginCredentials {
  // Admin/Teacher login
  email?: string
  password?: string
  
  // Student login
  studentNumber?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CourseFormData {
  courseName: string
  headTeacherEmail: string
  headTeacherPassword: string
}

export interface TeacherFormData {
  email: string
  password: string
}

export interface ClassFormData {
  name: string
  capacity: number
}

export interface SessionFormData {
  day: WeekDay
  startTime: string
  endTime: string
  capacity: number
}

export interface StudentImportData {
  student_number: string
  first_name: string
  last_name?: string
  email: string
  phone_number?: string
}

export interface StudentImportResult {
  success: boolean
  imported: number
  failed: number
  students?: Student[]
  errors?: string[]
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  variant?: 'default' | 'destructive'
}

export interface Modal {
  id: string
  component: string
  props: Record<string, unknown>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}

export interface LoadingState {
  isLoading: boolean
  message?: string
}

// ============================================================================
// ATTENDANCE MANAGEMENT TYPES
// ============================================================================

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  studentNumber: string
  sessionId: string
  date: string
  status: AttendanceStatus
  scanTime?: string
  markedBy?: string
}

export interface SessionWithAttendance extends Session {
  attendanceCount: number
  presentCount: number
  absentCount: number
  wrongSessionCount: number
  attendanceRecords?: AttendanceRecord[]
}

export interface AttendanceStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  wrongSessionCount: number
  attendanceRate: number
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

export interface OfflineAttendance {
  id: string
  studentUuid: string
  studentNumber: string
  sessionId: string
  timestamp: string
  qrData: string
  retryCount: number
}

export interface SyncStatus {
  pending: number
  synced: number
  failed: number
  lastSync?: Date
}

// ============================================================================
// SCHEDULE & REASSIGNMENT TYPES
// ============================================================================

export interface StudentSchedule {
  saturdaySession?: Session
  sundaySession?: Session
  class: Class
  course: Course
}

export interface ReassignmentOption {
  session: Session
  availableSpots: number
  isRecommended: boolean
}

export interface ReassignmentFormData {
  fromSessionId: string
  toSessionId: string
  reason?: string
}

// ============================================================================
// REPORTING TYPES
// ============================================================================

export interface AttendanceReport {
  period: {
    start: Date
    end: Date
  }
  courseId: string
  classId?: string
  sessionId?: string
  stats: AttendanceStats
  records: AttendanceRecord[]
}

export interface StudentAttendanceHistory {
  student: Student
  attendanceRecords: Attendance[]
  attendanceRate: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
  wrongSessionCount: number
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string
  message: string
}

export interface FormState<T> {
  data: T
  errors: ValidationError[]
  isValid: boolean
  isSubmitting: boolean
  isDirty: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type EntityId = string

export type Timestamp = Date | string

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

// ============================================================================
// STORE STATE TYPES
// ============================================================================

export interface BaseStoreState {
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface EntityStoreState<T> extends BaseStoreState {
  items: T[]
  selectedItem: T | null
  searchQuery: string
  filters: Record<string, unknown>
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}
