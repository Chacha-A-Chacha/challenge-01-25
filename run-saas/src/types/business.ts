// types/business.ts
import type { AttendanceStatus, WeekDay } from './enums'
import type { Student, Session, Attendance, Class, Course } from './database'

export interface QRCodeData {
  uuid: string
  student_id: string
}

export interface QRScanResult {
  success: boolean
  attendance?: Attendance
  message: string
  status?: AttendanceStatus
  student?: Student
  session?: Session
}

export interface QRValidationResult {
  isValid: boolean
  student?: Student
  session?: Session
  error?: string
  canScan: boolean
  timeWindow: {
    canGenerate: boolean
    canScan: boolean
    sessionActive: boolean
    minutesUntilStart?: number
    minutesUntilEnd?: number
  }
}

export interface SessionConflictCheck {
  classId: string
  day: WeekDay
  startTime: string
  endTime: string
  excludeSessionId?: string
}

export interface CapacityValidation {
  sessionId: string
  requestedCount: number
  available: number
  isValid: boolean
  waitlistPosition?: number
}

export interface AutoAssignmentResult {
  assigned: number
  failed: number
  errors: string[]
  assignments: Array<{
    studentId: string
    saturdaySessionId: string
    sundaySessionId: string
  }>
  unassigned: Student[]
}

export interface AttendanceWindow {
  sessionId: string
  isActive: boolean
  startsIn?: number // minutes
  endsIn?: number // minutes
  allowEarlyEntry: boolean
  allowLateEntry: boolean
  earlyEntryMinutes: number
  lateEntryMinutes: number
}

export interface AttendanceStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  wrongSessionCount: number
  attendanceRate: number
  capacity: number
  utilizationRate: number
}

export interface SessionStats extends AttendanceStats {
  sessionId: string
  date: Date
  sessionInfo: Session
}

export interface StudentSchedule {
  student: Student
  saturdaySession?: Session
  sundaySession?: Session
  class: Class
  course: Course
  nextSession?: Session
  attendanceRate: number
}

export interface ReassignmentOption {
  session: Session
  availableSpots: number
  isRecommended: boolean
  conflictReason?: string
  waitlistPosition?: number
}

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
  isLate?: boolean
  notes?: string
}

export interface SessionWithAttendance extends Session {
  attendanceCount: number
  presentCount: number
  absentCount: number
  wrongSessionCount: number
  attendanceRecords?: AttendanceRecord[]
  stats: AttendanceStats
}

export interface StudentAttendanceHistory {
  student: Student
  attendanceRecords: Attendance[]
  attendanceRate: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
  wrongSessionCount: number
  streak: {
    current: number
    longest: number
    type: 'present' | 'absent'
  }
}

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
  trends: {
    dailyAttendance: Array<{ date: string; rate: number }>
    studentPerformance: Array<{ studentId: string; rate: number }>
  }
}
