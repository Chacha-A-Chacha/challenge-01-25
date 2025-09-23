// lib/validations.ts
import { z } from 'zod'
import { 
  VALIDATION_RULES, 
  AUTH_CONFIG,
  SESSION_RULES,
  CLASS_RULES,
  EXCEL_IMPORT,
  WEEK_DAYS,
  ATTENDANCE_STATUS,
  REQUEST_STATUS,
  COURSE_STATUS,
  ERROR_MESSAGES
} from './constants'
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateStudentNumber,
  validateName,
  parseTimeToMinutes
} from './utils'

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(VALIDATION_RULES.EMAIL.MAX_LENGTH)
  .refine((email) => validateEmail(email) === null, {
    message: ERROR_MESSAGES.VALIDATION.INVALID_EMAIL
  })

export const phoneSchema = z
  .string()
  .optional()
  .refine((phone) => !phone || validatePhoneNumber(phone) === null, {
    message: ERROR_MESSAGES.VALIDATION.INVALID_PHONE
  })

export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((phone) => validatePhoneNumber(phone) === null, {
    message: ERROR_MESSAGES.VALIDATION.INVALID_PHONE
  })

export const studentNumberSchema = z
  .string()
  .min(1, 'Student number is required')
  .refine((studentNumber) => validateStudentNumber(studentNumber) === null, {
    message: ERROR_MESSAGES.VALIDATION.INVALID_STUDENT_NUMBER
  })

export const passwordSchema = z
  .string()
  .min(AUTH_CONFIG.PASSWORD_MIN_LENGTH, ERROR_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT)

export const nameSchema = z
  .string()
  .min(VALIDATION_RULES.NAME.MIN_LENGTH)
  .max(VALIDATION_RULES.NAME.MAX_LENGTH)
  .refine((name) => VALIDATION_RULES.NAME.REGEX.test(name), {
    message: 'Name contains invalid characters'
  })

export const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')

export const capacitySchema = z
  .number()
  .min(CLASS_RULES.MIN_CAPACITY)
  .max(CLASS_RULES.MAX_CAPACITY)

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const adminTeacherLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const studentLoginSchema = z.object({
  studentNumber: studentNumberSchema,
  phoneNumber: requiredPhoneSchema,
  firstName: nameSchema,
  lastName: nameSchema.optional()
})

// ============================================================================
// COURSE SCHEMAS
// ============================================================================

export const createCourseSchema = z.object({
  courseName: z
    .string()
    .min(VALIDATION_RULES.COURSE_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.COURSE_NAME.MAX_LENGTH)
    .regex(VALIDATION_RULES.COURSE_NAME.REGEX, 'Course name contains invalid characters'),
  
  headTeacherEmail: emailSchema,
  headTeacherPassword: passwordSchema
})

export const updateCourseSchema = z.object({
  name: z
    .string()
    .min(VALIDATION_RULES.COURSE_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.COURSE_NAME.MAX_LENGTH)
    .regex(VALIDATION_RULES.COURSE_NAME.REGEX)
    .optional(),
  
  endDate: z.date().optional(),
  status: z.enum([COURSE_STATUS.ACTIVE, COURSE_STATUS.INACTIVE, COURSE_STATUS.COMPLETED]).optional()
})

// ============================================================================
// TEACHER SCHEMAS
// ============================================================================

export const addTeacherSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

export const createClassSchema = z.object({
  name: z
    .string()
    .min(VALIDATION_RULES.CLASS_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.CLASS_NAME.MAX_LENGTH)
    .regex(VALIDATION_RULES.CLASS_NAME.REGEX, 'Class name contains invalid characters'),
  
  capacity: capacitySchema
})

export const createSessionSchema = z.object({
  day: z.enum([WEEK_DAYS.SATURDAY, WEEK_DAYS.SUNDAY]),
  startTime: timeSchema,
  endTime: timeSchema,
  capacity: capacitySchema
}).refine((data) => {
  const startMinutes = parseTimeToMinutes(data.startTime)
  const endMinutes = parseTimeToMinutes(data.endTime)
  const duration = endMinutes - startMinutes
  
  return duration >= SESSION_RULES.MIN_DURATION_MINUTES && 
         duration <= SESSION_RULES.MAX_DURATION_MINUTES
}, {
  message: `Session must be between ${SESSION_RULES.MIN_DURATION_MINUTES} and ${SESSION_RULES.MAX_DURATION_MINUTES} minutes`,
  path: ['endTime']
})

// ============================================================================
// STUDENT SCHEMAS
// ============================================================================

export const studentImportRowSchema = z.object({
  student_number: studentNumberSchema,
  first_name: nameSchema,
  last_name: nameSchema.optional(),
  email: emailSchema,
  phone_number: phoneSchema
})

export const bulkStudentImportSchema = z.object({
  students: z.array(studentImportRowSchema).min(1, 'At least one student required'),
  classId: z.uuid('Invalid class ID')
})

export const updateStudentSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phoneNumber: phoneSchema
})

// ============================================================================
// ATTENDANCE SCHEMAS
// ============================================================================

export const qrScanSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
  sessionId: z.uuid('Invalid session ID')
})

export const markAttendanceSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
  sessionId: z.uuid('Invalid session ID'),
  status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT]),
  date: z.date().optional()
})

export const bulkAttendanceSchema = z.object({
  sessionId: z.uuid('Invalid session ID'),
  attendanceRecords: z.array(z.object({
    studentId: z.uuid('Invalid student ID'),
    status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT])
  })).min(1, 'At least one attendance record required'),
  date: z.date().optional()
})

// ============================================================================
// REASSIGNMENT SCHEMAS
// ============================================================================

export const reassignmentRequestSchema = z.object({
  studentId: z.uuid('Invalid student ID'),
  fromSessionId: z.uuid('Invalid from session ID'),
  toSessionId: z.uuid('Invalid to session ID'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional()
})

export const updateReassignmentSchema = z.object({
  status: z.enum([REQUEST_STATUS.APPROVED, REQUEST_STATUS.DENIED])
})

// ============================================================================
// PAGINATION & FILTERING SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1).max(100, 'Limit cannot exceed 100').default(20),
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
  courseId: z.uuid().optional(),
  classId: z.uuid().optional(),
  sessionId: z.uuid().optional(),
  studentId: z.uuid().optional(),
  status: z.enum([
    ATTENDANCE_STATUS.PRESENT, 
    ATTENDANCE_STATUS.ABSENT, 
    ATTENDANCE_STATUS.WRONG_SESSION
  ]).optional(),
  dateRange: dateRangeSchema.optional()
})

// ============================================================================
// FORM VALIDATION HELPERS
// ============================================================================

export function validateFormField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { isValid: boolean; error?: string } {
  const result = schema.safeParse(value)
  
  if (result.success) {
    return { isValid: true }
  }
  
  const firstError = result.error.issues[0]
  return { 
    isValid: false, 
    error: firstError?.message || 'Validation failed'
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
  
  result.error.issues.forEach((issue: z.ZodIssue) => {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = issue.message
    }
  })
  
  return { isValid: false, errors }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

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
