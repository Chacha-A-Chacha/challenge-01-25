// types/enums.ts

export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const

export const TEACHER_ROLES = {
  HEAD: 'HEAD',
  ADDITIONAL: 'ADDITIONAL'
} as const

export const COURSE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  COMPLETED: 'COMPLETED'
} as const

export const WEEK_DAYS = {
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY'
} as const

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  WRONG_SESSION: 'WRONG_SESSION'
} as const

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED'
} as const

export const REGISTRATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
} as const

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type TeacherRole = typeof TEACHER_ROLES[keyof typeof TEACHER_ROLES]
export type CourseStatus = typeof COURSE_STATUS[keyof typeof COURSE_STATUS]
export type WeekDay = typeof WEEK_DAYS[keyof typeof WEEK_DAYS]
export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS]
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS]
export type RegistrationStatus = typeof REGISTRATION_STATUS[keyof typeof REGISTRATION_STATUS]
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES]
