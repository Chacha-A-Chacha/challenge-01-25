// types/components.ts
import type { AttendanceStatus } from './enums'
import type { Student, Session, Course, Teacher, Class } from './database'
import type { AttendanceStats, QRScanResult, ReassignmentOption, AttendanceRecord } from './business'
import type { StudentImportResult } from './forms'
import type { SessionCreateRequest, ReassignmentCreateRequest } from './api'

export interface QRGeneratorProps {
  student: Pick<Student, 'uuid' | 'studentNumber'>
  size?: number
  onGenerate?: (qrCode: string) => void
  className?: string
}

export interface QRScannerProps {
  sessionId: string
  onScanSuccess: (result: QRScanResult) => void
  onScanError: (error: string) => void
  enabled?: boolean
  className?: string
}

export interface StudentImportProps {
  classId: string
  onImportComplete: (result: StudentImportResult) => void
  onImportError: (error: string) => void
  maxFileSize?: number
  allowedFormats?: string[]
}

export interface AttendanceTableProps {
  sessionId: string
  students: Student[]
  attendanceRecords: AttendanceRecord[]
  onMarkAttendance: (studentId: string, status: AttendanceStatus) => void
  onBulkAction?: (studentIds: string[], action: string) => void
  readOnly?: boolean
}

export interface SessionScheduleProps {
  classId: string
  editable?: boolean
  onSessionSelect?: (session: Session) => void
  onSessionCreate?: (sessionData: SessionCreateRequest) => void
  onSessionUpdate?: (sessionId: string, updates: Partial<Session>) => void
}

export interface ReassignmentFormProps {
  student: Student & { sessions: Session[] }
  availableOptions: ReassignmentOption[]
  onSubmit: (request: ReassignmentCreateRequest) => void
  onCancel?: () => void
  maxRequests?: number
}

export interface StudentCardProps {
  student: Student
  showActions?: boolean
  onEdit?: (student: Student) => void
  onDelete?: (studentId: string) => void
  onViewAttendance?: (studentId: string) => void
  compact?: boolean
}

export interface SessionCardProps {
  session: Session
  showStudentCount?: boolean
  showCapacity?: boolean
  onSelect?: (session: Session) => void
  onEdit?: (session: Session) => void
  className?: string
}

export interface CourseCardProps {
  course: Course & { 
    headTeacher: Teacher
    _count: { teachers: number; classes: number; students: number }
  }
  onManage?: (courseId: string) => void
  onEdit?: (course: Course) => void
  onDeactivate?: (courseId: string) => void
}

export interface AttendanceStatsProps {
  stats: AttendanceStats
  sessionInfo?: Session
  showDetails?: boolean
  className?: string
}
