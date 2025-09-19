// lib/constants.ts
import type {
  UserRole,
  TeacherRole,
  CourseStatus,
  WeekDay,
  AttendanceStatus,
  RequestStatus,
  NotificationType
} from '@/types'

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================

export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const

export const TEACHER_ROLES = {
  HEAD: 'HEAD',
  ADDITIONAL: 'ADDITIONAL'
} as const

export const PERMISSIONS = {
  // Admin permissions
  CREATE_COURSE: 'create_course',
  MANAGE_SYSTEM: 'manage_system',
  REMOVE_HEAD_TEACHER: 'remove_head_teacher',
  DECLARE_PROGRAM_END: 'declare_program_end',
  
  // Head teacher permissions
  ADD_TEACHER: 'add_teacher',
  REMOVE_TEACHER: 'remove_teacher',
  CREATE_CLASS: 'create_class',
  
  // All teacher permissions
  IMPORT_STUDENTS: 'import_students',
  SCAN_ATTENDANCE: 'scan_attendance',
  CREATE_SESSION: 'create_session',
  APPROVE_REASSIGNMENT: 'approve_reassignment',
  VIEW_ATTENDANCE: 'view_attendance',
  MODIFY_SESSION_TIMES: 'modify_session_times',
  MANUAL_ATTENDANCE: 'manual_attendance',
  
  // Student permissions
  GENERATE_QR: 'generate_qr',
  VIEW_OWN_ATTENDANCE: 'view_own_attendance',
  REQUEST_REASSIGNMENT: 'request_reassignment'
} as const

// ============================================================================
// STATUS ENUMS
// ============================================================================

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

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

// ============================================================================
// AUTHENTICATION CONFIGURATION
// ============================================================================

export const AUTH_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours
  SESSION_EXTEND_THRESHOLD: 30 * 60 * 1000, // 30 minutes
  
  PASSWORD_REQUIREMENTS: {
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },
  
  STUDENT_AUTH_METHODS: {
    STUDENT_NUMBER_PHONE: 'student_number_phone',
    STUDENT_NUMBER_EMAIL: 'student_number_email',
    STUDENT_NUMBER_NAME: 'student_number_name'
  }
} as const

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254,
    DOMAIN_BLOCKLIST: ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
  },
  
  PHONE: {
    REGEX: /^[\+]?[1-9][\d]{0,15}$/,
    LOCAL_REGEX: /^(\+254|254|0)?[1-9]\d{8}$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 15
  },
  
  STUDENT_NUMBER: {
    REGEX: /^[A-Z0-9]{3,20}$/,
    MIN_LENGTH: 3,
    MAX_LENGTH: 20
  },
  
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z\s\-'\.]+$/
  },
  
  COURSE_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    REGEX: /^[a-zA-Z0-9\s\-'\.()]+$/
  },
  
  CLASS_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z0-9\s\-'\.()]+$/
  }
} as const

// ============================================================================
// BUSINESS RULES
// ============================================================================

export const SESSION_RULES = {
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 240,
  EARLY_ENTRY_MINUTES: 15,
  LATE_ENTRY_MINUTES: 30,
  MIN_START_TIME: '08:00',
  MAX_END_TIME: '18:00',
  QR_GENERATION_WINDOW_MINUTES: 30
} as const

export const CLASS_RULES = {
  MIN_CAPACITY: 5,
  MAX_CAPACITY: 100,
  DEFAULT_CAPACITY: 25
} as const

export const ATTENDANCE_RULES = {
  MAX_REASSIGNMENT_REQUESTS: 3,
  AUTO_MARK_ABSENT_DELAY_HOURS: 2,
  WRONG_SESSION_GRACE_PERIOD_MINUTES: 10
} as const

export const EXCEL_IMPORT = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 1000,
  BATCH_SIZE: 50,
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.csv'],
  
  REQUIRED_COLUMNS: [
    'student_number',
    'first_name',
    'email'
  ],
  
  OPTIONAL_COLUMNS: [
    'last_name',
    'phone_number'
  ],
  
  ALTERNATIVE_HEADERS: {
    student_number: ['Student Number', 'Student_Number', 'ID', 'StudentID'],
    first_name: ['First Name', 'FirstName', 'Given Name', 'GivenName'],
    last_name: ['Last Name', 'LastName', 'Surname', 'Family Name'],
    email: ['Email', 'Email Address', 'EmailAddress'],
    phone_number: ['Phone Number', 'PhoneNumber', 'Phone', 'Mobile']
  }
} as const

// ============================================================================
// QR CODE CONFIGURATION
// ============================================================================

export const QR_CONFIG = {
  SIZE: 256,
  ERROR_CORRECTION_LEVEL: 'M' as const,
  MARGIN: 4,
  
  DATA_FORMAT: {
    VERSION: '1.0',
    REQUIRED_FIELDS: ['uuid', 'student_id'] as const
  },
  
  VALIDATION: {
    MAX_AGE_MINUTES: 60,
    ALLOW_MULTIPLE_SCANS: false
  }
} as const

// ============================================================================
// API ROUTES
// ============================================================================

export const API_ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/signin',
    LOGOUT: '/api/auth/signout',
    SESSION: '/api/auth/session'
  },
  
  // Admin endpoints
  COURSES: '/api/courses',
  COURSE_BY_ID: (id: string) => `/api/courses/${id}`,
  REMOVE_HEAD_TEACHER: (courseId: string) => `/api/courses/${courseId}/remove-head-teacher`,
  
  // Teacher endpoints
  TEACHERS: '/api/teachers',
  CLASSES: '/api/classes',
  CLASS_BY_ID: (id: string) => `/api/classes/${id}`,
  SESSIONS: '/api/sessions',
  SESSION_BY_ID: (id: string) => `/api/sessions/${id}`,
  SESSIONS_BY_CLASS: (classId: string) => `/api/sessions?classId=${classId}`,
  
  // Student management
  STUDENTS: '/api/students',
  STUDENT_BY_ID: (id: string) => `/api/students/${id}`,
  STUDENTS_IMPORT: '/api/students/import',
  STUDENTS_AUTO_ASSIGN: '/api/students/auto-assign',
  STUDENT_REASSIGN: (id: string) => `/api/students/${id}/reassign`,
  
  // Attendance
  ATTENDANCE_SCAN: '/api/attendance/scan',
  ATTENDANCE_BY_SESSION: (sessionId: string) => `/api/attendance/session/${sessionId}`,
  ATTENDANCE_MANUAL: '/api/attendance/manual',
  ATTENDANCE_BULK: '/api/attendance/bulk',
  
  // Student portal
  STUDENT: {
    SCHEDULE: '/api/student/schedule',
    ATTENDANCE: '/api/student/attendance',
    QR_GENERATE: '/api/student/qr-generate',
    REASSIGNMENT_REQUESTS: '/api/student/reassignment-requests',
    REASSIGNMENT_OPTIONS: '/api/student/reassignment-options',
    CANCEL_REQUEST: (id: string) => `/api/student/reassignment-requests/${id}/cancel`
  }
} as const

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You do not have permission to perform this action'
  },
  
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    PASSWORD_TOO_SHORT: `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters`,
    INVALID_STUDENT_NUMBER: 'Student number must be 3-20 characters (letters and numbers only)'
  },
  
  FILE_UPLOAD: {
    FILE_TOO_LARGE: `File size must be less than ${EXCEL_IMPORT.MAX_FILE_SIZE / 1024 / 1024}MB`,
    INVALID_FORMAT: 'Only Excel (.xlsx, .xls) and CSV files are allowed',
    PARSING_FAILED: 'Failed to read the file. Please check the format.',
    TOO_MANY_ROWS: `File contains too many rows. Maximum allowed: ${EXCEL_IMPORT.MAX_ROWS}`
  },
  
  ATTENDANCE: {
    OUTSIDE_SESSION_TIME: 'QR scanning is only allowed during session hours',
    ALREADY_MARKED: 'Attendance already marked for this session',
    WRONG_SESSION: 'Student scanned in wrong session',
    STUDENT_NOT_FOUND: 'Student not found',
    SESSION_NOT_FOUND: 'Session not found'
  },
  
  REASSIGNMENT: {
    MAX_REQUESTS_REACHED: `Maximum reassignment requests (${ATTENDANCE_RULES.MAX_REASSIGNMENT_REQUESTS}) reached`,
    PENDING_REQUEST_EXISTS: 'You already have a pending reassignment request',
    SAME_DAY_ONLY: 'Reassignment only allowed within the same day',
    SAME_CLASS_ONLY: 'Reassignment only allowed within the same class',
    SESSION_FULL: 'Target session is at full capacity'
  }
} as const

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Successfully logged in',
    LOGOUT_SUCCESS: 'Successfully logged out'
  },
  
  COURSE: {
    CREATED: 'Course and head teacher created successfully',
    UPDATED: 'Course updated successfully',
    DELETED: 'Course deleted successfully'
  },
  
  CLASS: {
    CREATED: 'Class created successfully',
    UPDATED: 'Class updated successfully',
    DELETED: 'Class deleted successfully'
  },
  
  SESSION: {
    CREATED: 'Session created successfully',
    UPDATED: 'Session updated successfully',
    DELETED: 'Session deleted successfully'
  },
  
  STUDENT: {
    IMPORTED: 'Students imported successfully',
    UPDATED: 'Student updated successfully',
    DELETED: 'Student deleted successfully',
    AUTO_ASSIGNED: 'Students auto-assigned to sessions successfully'
  },
  
  ATTENDANCE: {
    MARKED: 'Attendance marked successfully',
    UPDATED: 'Attendance updated successfully'
  },
  
  REASSIGNMENT: {
    REQUESTED: 'Reassignment request submitted successfully',
    APPROVED: 'Reassignment request approved',
    DENIED: 'Reassignment request denied',
    CANCELLED: 'Reassignment request cancelled'
  }
} as const

// ============================================================================
// REQUEST TIMEOUTS
// ============================================================================

export const REQUEST_TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  FILE_UPLOAD: 60000, // 1 minute
  LONG_RUNNING: 30000, // 30 seconds
  QR_SCAN: 5000 // 5 seconds
} as const

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    LIMITS: [10, 20, 50, 100] as const
  },
  
  NOTIFICATIONS: {
    DEFAULT_DURATION: 5000,
    SUCCESS_DURATION: 4000,
    ERROR_DURATION: 6000,
    WARNING_DURATION: 5000,
    INFO_DURATION: 4000,
    MAX_NOTIFICATIONS: 5
  },
  
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536
  }
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS]
export type ApiRoute = keyof typeof API_ROUTES
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES
