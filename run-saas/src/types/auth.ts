// types/auth.ts

export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const

export const TEACHER_ROLES = {
  HEAD: 'HEAD',
  ADDITIONAL: 'ADDITIONAL'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type TeacherRole = typeof TEACHER_ROLES[keyof typeof TEACHER_ROLES]

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

export interface SessionData extends AuthUser {
  expires: string
}
