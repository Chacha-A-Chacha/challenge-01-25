// types/database.ts
import type { CourseStatus, WeekDay, AttendanceStatus, RequestStatus } from './enums'
import type { TeacherRole } from './auth'

// Base entity interfaces matching Prisma schema exactly
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
