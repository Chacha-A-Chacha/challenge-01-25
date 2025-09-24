// lib/validations.ts
import { z } from 'zod'
import {
  VALIDATION_RULES,
  SESSION_RULES,
  CLASS_RULES,
  ERROR_MESSAGES
} from './constants'

export const emailSchema = z
  .string()
  .min(1, ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
  .max(VALIDATION_RULES.EMAIL.MAX_LENGTH, `Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters`)
  .regex(VALIDATION_RULES.EMAIL.REGEX, ERROR_MESSAGES.VALIDATION.INVALID_EMAIL)

export const phoneSchema = z
  .string()
  .optional()
  .refine((phone) => !phone || VALIDATION_RULES.PHONE.LOCAL_REGEX.test(phone), {
    message: ERROR_MESSAGES.VALIDATION.INVALID_PHONE
  })

export const requiredPhoneSchema = z
  .string()
  .min(1, ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
  .regex(VALIDATION_RULES.PHONE.LOCAL_REGEX, ERROR_MESSAGES.VALIDATION.INVALID_PHONE)

export const studentNumberSchema = z
  .string()
  .min(VALIDATION_RULES.STUDENT_NUMBER.MIN_LENGTH)
  .max(VALIDATION_RULES.STUDENT_NUMBER.MAX_LENGTH)
  .regex(VALIDATION_RULES.STUDENT_NUMBER.REGEX, ERROR_MESSAGES.VALIDATION.INVALID_STUDENT_NUMBER)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')

export const nameSchema = z
  .string()
  .min(VALIDATION_RULES.NAME.MIN_LENGTH, `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.NAME.MAX_LENGTH, `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`)
  .regex(VALIDATION_RULES.NAME.REGEX, 'Name contains invalid characters')

export const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
  .refine((time) => {
    const [hours] = time.split(':').map(Number)
    return hours >= 8 && hours <= 18
  }, 'Session must be between 8:00 AM and 6:00 PM')

export const capacitySchema = z
  .number()
  .min(CLASS_RULES.MIN_CAPACITY, `Capacity must be at least ${CLASS_RULES.MIN_CAPACITY}`)
  .max(CLASS_RULES.MAX_CAPACITY, `Capacity cannot exceed ${CLASS_RULES.MAX_CAPACITY}`)

export const uuidSchema = z
  .string()
  .uuid('Invalid ID format')

export const adminTeacherLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const studentLoginSchema = z.object({
  studentNumber: studentNumberSchema,
  phoneNumber: phoneSchema,
  email: emailSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional()
}).refine((data) => {
  // At least one verification method required
  return data.phoneNumber || data.email || (data.firstName && data.lastName)
}, {
  message: 'At least one verification method required (phone, email, or full name)',
  path: ['phoneNumber']
})

export const createCourseSchema = z.object({
  courseName: z
    .string()
    .min(2, 'Course name must be at least 2 characters')
    .max(100, 'Course name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.()]+$/, 'Course name contains invalid characters'),

  headTeacherEmail: emailSchema,
  headTeacherPassword: passwordSchema
})

export const updateCourseSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  endDate: z.date().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED'] as const).optional()
}).partial()

export const addTeacherSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

export const createClassSchema = z.object({
  name: z
    .string()
    .min(2, 'Class name must be at least 2 characters')
    .max(50, 'Class name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Class name contains invalid characters'),

  capacity: capacitySchema
})

export const createSessionSchema = z.object({
  day: z.enum(['SATURDAY', 'SUNDAY'] as const),
  startTime: timeSchema,
  endTime: timeSchema,
  capacity: capacitySchema
}).refine((data) => {
  const startMinutes = parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1])
  const endMinutes = parseInt(data.endTime.split(':')[0]) * 60 + parseInt(data.endTime.split(':')[1])
  const duration = endMinutes - startMinutes

  return duration >= SESSION_RULES.MIN_DURATION_MINUTES && duration <= SESSION_RULES.MAX_DURATION_MINUTES
}, {
  message: `Session must be between ${SESSION_RULES.MIN_DURATION_MINUTES} and ${SESSION_RULES.MAX_DURATION_MINUTES} minutes`,
  path: ['endTime']
})

export const studentImportRowSchema = z.object({
  student_number: studentNumberSchema,
  first_name: nameSchema,
  last_name: nameSchema.optional(),
  email: emailSchema,
  phone_number: phoneSchema
})

export const bulkStudentImportSchema = z.object({
  students: z.array(studentImportRowSchema).min(1, 'At least one student required'),
  classId: uuidSchema
})

export const updateStudentSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phoneNumber: phoneSchema
}).partial()

export const qrScanSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
  sessionId: uuidSchema
})

export const markAttendanceSchema = z.object({
  studentId: uuidSchema,
  sessionId: uuidSchema,
  status: z.enum(['PRESENT', 'ABSENT'] as const),
  date: z.date().optional()
})

export const bulkAttendanceSchema = z.object({
  sessionId: uuidSchema,
  attendanceRecords: z.array(z.object({
    studentId: uuidSchema,
    status: z.enum(['PRESENT', 'ABSENT'] as const)
  })).min(1, 'At least one attendance record required'),
  date: z.date().optional()
})

export const reassignmentRequestSchema = z.object({
  studentId: uuidSchema,
  fromSessionId: uuidSchema,
  toSessionId: uuidSchema,
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional()
}).refine((data) => data.fromSessionId !== data.toSessionId, {
  message: 'Cannot reassign to the same session',
  path: ['toSessionId']
})

export const updateReassignmentSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED'] as const)
})

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
})

export const attendanceFilterSchema = z.object({
  courseId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  sessionId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'WRONG_SESSION'] as const).optional(),
  dateRange: dateRangeSchema.optional()
})

export function validateFormField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { isValid: boolean; error?: string } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { isValid: true }
  }

  return {
    isValid: false,
    error: result.error.issues[0]?.message || 'Validation failed'
  }
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { isValid: boolean; errors: Record<string, string>; data?: T } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { isValid: true, errors: {}, data: result.data }
  }

  const errors: Record<string, string> = {}

  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = issue.message
    }
  })

  return { isValid: false, errors }
}

export type AdminTeacherLogin = z.infer<typeof adminTeacherLoginSchema>
export type StudentLogin = z.infer<typeof studentLoginSchema>
export type CreateCourse = z.infer<typeof createCourseSchema>
export type UpdateCourse = z.infer<typeof updateCourseSchema>
export type AddTeacher = z.infer<typeof addTeacherSchema>
export type CreateClass = z.infer<typeof createClassSchema>
export type CreateSession = z.infer<typeof createSessionSchema>
export type StudentImportRow = z.infer<typeof studentImportRowSchema>
export type BulkStudentImport = z.infer<typeof bulkStudentImportSchema>
export type UpdateStudent = z.infer<typeof updateStudentSchema>
export type QRScan = z.infer<typeof qrScanSchema>
export type MarkAttendance = z.infer<typeof markAttendanceSchema>
export type BulkAttendance = z.infer<typeof bulkAttendanceSchema>
export type ReassignmentRequest = z.infer<typeof reassignmentRequestSchema>
export type UpdateReassignment = z.infer<typeof updateReassignmentSchema>
export type Pagination = z.infer<typeof paginationSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
export type AttendanceFilter = z.infer<typeof attendanceFilterSchema>
