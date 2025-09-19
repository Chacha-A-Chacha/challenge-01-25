// lib/validations.ts

import { z } from 'zod'
import { 
  VALIDATION_RULES, 
  AUTH_CONFIG,
  STUDENT_AUTH_METHODS,
  WEEK_DAYS,
  ATTENDANCE_STATUS,
  REQUEST_STATUS,
  COURSE_STATUS,
  SESSION_RULES,
  CLASS_RULES,
  EXCEL_IMPORT,
  QR_CONFIG,
  ATTENDANCE_RULES
} from './constants'
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateStudentNumber,
  validateName,
  validatePassword,
  validateSessionTime,
  parseTimeToMinutes,
  timeRangesOverlap
} from './utils'

// ============================================================================
// COMMON REUSABLE SCHEMAS (DRY Base Components)
// ============================================================================

/**
 * Base email validation schema
 * Used across all user types and forms
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(VALIDATION_RULES.EMAIL.MAX_LENGTH, `Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters`)
  .refine((email) => {
    const validation = validateEmail(email)
    return validation === null
  }, (email) => {
    const validation = validateEmail(email)
    return { message: validation?.message || 'Invalid email' }
  })

/**
 * Base phone number validation schema
 * Used in student imports and authentication
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine((phone) => {
    if (!phone) return true // Optional field
    const validation = validatePhoneNumber(phone)
    return validation === null
  }, (phone) => {
    const validation = validatePhoneNumber(phone || '')
    return { message: validation?.message || 'Invalid phone number' }
  })

/**
 * Required phone number schema
 * Used in student authentication
 */
export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((phone) => {
    const validation = validatePhoneNumber(phone)
    return validation === null
  }, (phone) => {
    const validation = validatePhoneNumber(phone)
    return { message: validation?.message || 'Invalid phone number' }
  })

/**
 * Student number validation schema
 * Used in imports and authentication
 */
export const studentNumberSchema = z
  .string()
  .min(1, 'Student number is required')
  .refine((studentNumber) => {
    const validation = validateStudentNumber(studentNumber)
    return validation === null
  }, (studentNumber) => {
    const validation = validateStudentNumber(studentNumber)
    return { message: validation?.message || 'Invalid student number' }
  })

/**
 * Name validation schema
 * Used for first/last names across all forms
 */
export const nameSchema = z
  .string()
  .min(VALIDATION_RULES.NAME.MIN_LENGTH, `Must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.NAME.MAX_LENGTH, `Must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`)
  .regex(VALIDATION_RULES.NAME.REGEX, 'Contains invalid characters')

/**
 * Optional name validation schema
 * Used for optional last names
 */
export const optionalNameSchema = nameSchema.optional()

/**
 * Password validation schema
 * Used in admin/teacher account creation
 */
export const passwordSchema = z
  .string()
  .min(AUTH_CONFIG.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters`)
  .refine((password) => {
    const validationErrors = validatePassword(password)
    return validationErrors.length === 0
  }, (password) => {
    const validationErrors = validatePassword(password)
    return { message: validationErrors[0]?.message || 'Invalid password' }
  })

/**
 * Time validation schema
 * Used in session scheduling
 */
export const timeSchema = z
  .string()
  .regex(VALIDATION_RULES.SESSION_TIME.REGEX, 'Invalid time format (use HH:MM)')

/**
 * Capacity validation schema
 * Used in class and session capacity settings
 */
export const capacitySchema = z
  .number()
  .min(CLASS_RULES.CAPACITY_LIMITS.MIN, `Capacity must be at least ${CLASS_RULES.CAPACITY_LIMITS.MIN}`)
  .max(CLASS_RULES.CAPACITY_LIMITS.MAX, `Capacity cannot exceed ${CLASS_RULES.CAPACITY_LIMITS.MAX}`)

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Admin/Teacher login schema
 * Standard email + password authentication
 */
export const adminTeacherLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

/**
 * Student authentication schema with multiple methods
 * Based on documentation: Phone (primary), Email (alt), Name (fallback)
 */
export const studentLoginSchema = z.object({
  studentNumber: studentNumberSchema,
  
  // Primary method: Student Number + Phone
  phoneNumber: z.string().optional(),
  
  // Alternative method: Student Number + Email
  email: z.string().optional(),
  
  // Fallback method: Student Number + First Name + Last Name
  firstName: z.string().optional(),
  lastName: z.string().optional()
}).refine((data) => {
  // At least one authentication method must be provided
  const hasPhone = data.phoneNumber && data.phoneNumber.length > 0
  const hasEmail = data.email && data.email.length > 0
  const hasName = data.firstName && data.firstName.length > 0 && data.lastName && data.lastName.length > 0
  
  return hasPhone || hasEmail || hasName
}, {
  message: 'Please provide phone number, email, or full name for verification',
  path: ['authentication']
}).refine((data) => {
  // Validate phone if provided
  if (data.phoneNumber) {
    const validation = validatePhoneNumber(data.phoneNumber)
    return validation === null
  }
  return true
}, {
  message: 'Invalid phone number format',
  path: ['phoneNumber']
}).refine((data) => {
  // Validate email if provided
  if (data.email) {
    const validation = validateEmail(data.email)
    return validation === null
  }
  return true
}, {
  message: 'Invalid email format',
  path: ['email']
}).refine((data) => {
  // Validate names if provided
  if (data.firstName) {
    const validation = validateName(data.firstName, 'firstName')
    if (validation !== null) return false
  }
  if (data.lastName) {
    const validation = validateName(data.lastName, 'lastName')
    if (validation !== null) return false
  }
  return true
}, {
  message: 'Invalid name format',
  path: ['firstName']
})

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

/**
 * Course creation schema
 * Admin creates course + head teacher simultaneously (per documentation)
 */
export const createCourseSchema = z.object({
  courseName: z
    .string()
    .min(VALIDATION_RULES.COURSE_NAME.MIN_LENGTH, `Course name must be at least ${VALIDATION_RULES.COURSE_NAME.MIN_LENGTH} characters`)
    .max(VALIDATION_RULES.COURSE_NAME.MAX_LENGTH, `Course name must be less than ${VALIDATION_RULES.COURSE_NAME.MAX_LENGTH} characters`)
    .regex(VALIDATION_RULES.COURSE_NAME.REGEX, 'Course name contains invalid characters'),
  
  headTeacherEmail: emailSchema,
  headTeacherPassword: passwordSchema
})

/**
 * Course update schema
 * For updating course details
 */
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

/**
 * Add teacher schema
 * Head teacher adds additional teachers
 */
export const addTeacherSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

/**
 * Class creation schema
 * Head teacher creates classes
 */
export const createClassSchema = z.object({
  name: z
    .string()
    .min(VALIDATION_RULES.CLASS_NAME.MIN_LENGTH, `Class name must be at least ${VALIDATION_RULES.CLASS_NAME.MIN_LENGTH} characters`)
    .max(VALIDATION_RULES.CLASS_NAME.MAX_LENGTH, `Class name must be less than ${VALIDATION_RULES.CLASS_NAME.MAX_LENGTH} characters`)
    .regex(VALIDATION_RULES.CLASS_NAME.REGEX, 'Class name contains invalid characters'),
  
  capacity: capacitySchema
})

/**
 * Session creation schema
 * Teachers create Saturday/Sunday sessions per class
 */
export const createSessionSchema = z.object({
  day: z.enum([WEEK_DAYS.SATURDAY, WEEK_DAYS.SUNDAY]),
  startTime: timeSchema,
  endTime: timeSchema,
  capacity: capacitySchema
}).refine((data) => {
  // Validate session times don't conflict and meet duration requirements
  const validationErrors = validateSessionTime(data.startTime, data.endTime)
  return validationErrors.length === 0
}, (data) => {
  const validationErrors = validateSessionTime(data.startTime, data.endTime)
  return { 
    message: validationErrors[0]?.message || 'Invalid session time',
    path: ['startTime'] 
  }
})

/**
 * Session update schema
 * For modifying session times (teacher permission)
 */
export const updateSessionSchema = z.object({
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  capacity: capacitySchema.optional()
}).refine((data) => {
  // If updating times, validate them together
  if (data.startTime && data.endTime) {
    const validationErrors = validateSessionTime(data.startTime, data.endTime)
    return validationErrors.length === 0
  }
  return true
}, (data) => {
  if (data.startTime && data.endTime) {
    const validationErrors = validateSessionTime(data.startTime, data.endTime)
    return { 
      message: validationErrors[0]?.message || 'Invalid session time',
      path: ['startTime'] 
    }
  }
  return { message: 'Both start and end times required when updating session time' }
})

// ============================================================================
// STUDENT MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Single student import data schema
 * Used for Excel import validation
 */
export const studentImportDataSchema = z.object({
  student_number: studentNumberSchema,
  first_name: nameSchema,
  last_name: optionalNameSchema,
  email: emailSchema,
  phone_number: phoneSchema
})

/**
 * Bulk student import schema
 * Validates array of students with row-level error reporting
 */
export const bulkStudentImportSchema = z.object({
  students: z
    .array(studentImportDataSchema)
    .min(1, 'At least one student is required')
    .max(EXCEL_IMPORT.MAX_ROWS, `Cannot import more than ${EXCEL_IMPORT.MAX_ROWS} students at once`)
    .refine((students) => {
      // Check for duplicate student numbers within the import
      const studentNumbers = students.map(s => s.student_number)
      const uniqueNumbers = new Set(studentNumbers)
      return uniqueNumbers.size === studentNumbers.length
    }, {
      message: 'Duplicate student numbers found in import data'
    }),
  
  classId: z.string().uuid('Invalid class ID')
})

/**
 * Student update schema
 * For updating individual student information
 */
export const updateStudentSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: optionalNameSchema,
  email: emailSchema.optional(),
  phoneNumber: phoneSchema
})

/**
 * Student reassignment schema
 * Manual reassignment by teacher
 */
export const reassignStudentSchema = z.object({
  saturdaySessionId: z.string().uuid('Invalid Saturday session ID'),
  sundaySessionId: z.string().uuid('Invalid Sunday session ID')
})

// ============================================================================
// STUDENT PORTAL SCHEMAS
// ============================================================================

/**
 * Student reassignment request schema
 * Student requests session change (within same class, same day)
 */
export const reassignmentRequestSchema = z.object({
  fromSessionId: z.string().uuid('Invalid current session ID'),
  toSessionId: z.string().uuid('Invalid target session ID'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional()
})

/**
 * QR code generation schema
 * Validates QR code request
 */
export const qrGenerationSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  sessionId: z.string().uuid('Invalid session ID').optional()
})

// ============================================================================
// ATTENDANCE SCHEMAS
// ============================================================================

/**
 * QR scan data schema
 * Validates scanned QR code content
 */
export const qrScanDataSchema = z.object({
  uuid: z.string().uuid('Invalid student UUID'),
  student_id: z.string().min(1, 'Student ID is required')
})

/**
 * Attendance scan schema
 * QR code scanning request
 */
export const attendanceScanSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
  sessionId: z.string().uuid('Invalid session ID'),
  offlineTimestamp: z.string().datetime().optional(),
  isOfflineSync: z.boolean().default(false)
}).refine((data) => {
  // Validate QR data format
  try {
    const parsed = JSON.parse(data.qrData)
    const result = qrScanDataSchema.safeParse(parsed)
    return result.success
  } catch {
    return false
  }
}, {
  message: 'Invalid QR code format',
  path: ['qrData']
})

/**
 * Manual attendance schema
 * Teacher manually marks attendance
 */
export const manualAttendanceSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT]),
  date: z.date().optional()
})

/**
 * Bulk attendance update schema
 * Multiple attendance records at once
 */
export const bulkAttendanceSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  attendanceRecords: z.array(z.object({
    studentId: z.string().uuid('Invalid student ID'),
    status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT])
  })).min(1, 'At least one attendance record required'),
  date: z.date().optional()
})

// ============================================================================
// SEARCH AND FILTERING SCHEMAS
// ============================================================================

/**
 * Pagination schema
 * Used across all list endpoints
 */
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1).max(100, 'Limit cannot exceed 100').default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

/**
 * Date range schema
 * Used in attendance reports, analytics
 */
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine((data) => {
  return data.startDate <= data.endDate
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
})

/**
 * Attendance filter schema
 * For filtering attendance records
 */
export const attendanceFilterSchema = z.object({
  courseId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.WRONG_SESSION]).optional(),
  dateRange: dateRangeSchema.optional()
})

// ============================================================================
// FORM VALIDATION HELPERS (DRY for Frontend Forms)
// ============================================================================

/**
 * Generic form field validation
 * Returns user-friendly error messages for forms
 */
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
    error: firstError.message 
  }
}

/**
 * Validate entire form object
 * Returns field-specific errors for form display
 */
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

/**
 * Async validation wrapper
 * For validations that require database checks
 */
export async function validateWithAsyncChecks<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  asyncChecks?: Array<(data: T) => Promise<string | null>>
): Promise<{ isValid: boolean; errors: Record<string, string>; data?: T }> {
  // First run sync validation
  const syncResult = validateForm(schema, data)
  
  if (!syncResult.isValid || !asyncChecks || asyncChecks.length === 0) {
    return syncResult
  }
  
  // Run async checks
  const asyncErrors: Record<string, string> = {}
  
  for (const check of asyncChecks) {
    try {
      const error = await check(syncResult.data!)
      if (error) {
        asyncErrors['async'] = error
        break // Stop on first async error
      }
    } catch (error) {
      asyncErrors['async'] = 'Validation error occurred'
      break
    }
  }
  
  if (Object.keys(asyncErrors).length > 0) {
    return {
      isValid: false,
      errors: { ...syncResult.errors, ...asyncErrors }
    }
  }
  
  return syncResult
}

// ============================================================================
// BUSINESS RULE VALIDATORS (DRY for Domain Logic)
// ============================================================================

/**
 * Validate session time conflicts within class
 * Used in session creation/editing
 */
export async function validateSessionConflicts(
  classId: string,
  day: typeof WEEK_DAYS.SATURDAY | typeof WEEK_DAYS.SUNDAY,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<string | null> {
  const { validateSessionTime: dbValidateSessionTime } = await import('./db')
  
  const isValid = await dbValidateSessionTime(classId, day, startTime, endTime, excludeSessionId)
  
  if (!isValid) {
    return 'Session time conflicts with existing session in this class'
  }
  
  return null
}

/**
 * Validate reassignment request business rules
 * Used in reassignment request creation
 */
export async function validateReassignmentRules(
  studentId: string,
  fromSessionId: string,
  toSessionId: string
): Promise<string | null> {
  const { validateReassignmentRequest } = await import('./db')
  
  try {
    await validateReassignmentRequest(studentId, fromSessionId, toSessionId)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Reassignment validation failed'
  }
}

/**
 * Validate QR generation timing
 * Used in student QR generation
 */
export function validateQRGenerationTiming(
  sessions: Array<{ day: typeof WEEK_DAYS.SATURDAY | typeof WEEK_DAYS.SUNDAY; startTime: string; endTime: string }>
): string | null {
  const { canGenerateQR } = await import('./utils')
  
  const saturdaySession = sessions.find(s => s.day === WEEK_DAYS.SATURDAY)
  const sundaySession = sessions.find(s => s.day === WEEK_DAYS.SUNDAY)
  
  if (!canGenerateQR(saturdaySession || null, sundaySession || null)) {
    return 'QR codes can only be generated 30 minutes before session start until session end'
  }
  
  return null
}

// ============================================================================
// TYPE EXPORTS (For Type Safety)
// ============================================================================

// Export inferred types for use in components and API routes
export type AdminTeacherLogin = z.infer<typeof adminTeacherLoginSchema>
export type StudentLogin = z.infer<typeof studentLoginSchema>
export type CreateCourse = z.infer<typeof createCourseSchema>
export type UpdateCourse = z.infer<typeof updateCourseSchema>
export type AddTeacher = z.infer<typeof addTeacherSchema>
export type CreateClass = z.infer<typeof createClassSchema>
export type CreateSession = z.infer<typeof createSessionSchema>
export type UpdateSession = z.infer<typeof updateSessionSchema>
export type StudentImportData = z.infer<typeof studentImportDataSchema>
export type BulkStudentImport = z.infer<typeof bulkStudentImportSchema>
export type UpdateStudent = z.infer<typeof updateStudentSchema>
export type ReassignStudent = z.infer<typeof reassignStudentSchema>
export type ReassignmentRequest = z.infer<typeof reassignmentRequestSchema>
export type QRGeneration = z.infer<typeof qrGenerationSchema>
export type QRScanData = z.infer<typeof qrScanDataSchema>
export type AttendanceScan = z.infer<typeof attendanceScanSchema>
export type ManualAttendance = z.infer<typeof manualAttendanceSchema>
export type BulkAttendance = z.infer<typeof bulkAttendanceSchema>
export type Pagination = z.infer<typeof paginationSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
export type AttendanceFilter = z.infer<typeof attendanceFilterSchema>

// ============================================================================
// SCHEMA COLLECTIONS (For Organized Imports)
// ============================================================================

export const authSchemas = {
  adminTeacherLogin: adminTeacherLoginSchema,
  studentLogin: studentLoginSchema
} as const

export const adminSchemas = {
  createCourse: createCourseSchema,
  updateCourse: updateCourseSchema
} as const

export const teacherSchemas = {
  addTeacher: addTeacherSchema,
  createClass: createClassSchema,
  createSession: createSessionSchema,
  updateSession: updateSessionSchema,
  bulkStudentImport: bulkStudentImportSchema,
  updateStudent: updateStudentSchema,
  reassignStudent: reassignStudentSchema
} as const

export const studentSchemas = {
  reassignmentRequest: reassignmentRequestSchema,
  qrGeneration: qrGenerationSchema
} as const

export const attendanceSchemas = {
  qrScanData: qrScanDataSchema,
  attendanceScan: attendanceScanSchema,
  manualAttendance: manualAttendanceSchema,
  bulkAttendance: bulkAttendanceSchema
} as const

export const commonSchemas = {
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  attendanceFilter: attendanceFilterSchema
} as const
