// lib/constants.ts

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

export const APP_CONFIG = {
  NAME: 'Weekend Academy Attendance System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Student attendance tracking system using QR codes',
  SUPPORT_EMAIL: 'support@weekendacademy.com'
} as const

export const ENVIRONMENT = {
  DEV: 'development',
  STAGING: 'staging',
  PROD: 'production'
} as const

// ============================================================================
// AUTHENTICATION & SECURITY
// ============================================================================

export const AUTH_CONFIG = {
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  SESSION_EXTEND_THRESHOLD: 30 * 60 * 1000, // Extend session if 30 minutes left
  INACTIVITY_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours of inactivity logs out
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  JWT_ALGORITHM: 'HS256'
} as const

// Student authentication methods (based on documentation)
export const STUDENT_AUTH_METHODS = {
  PRIMARY: 'phone', // Student Number + Phone Number
  ALTERNATIVE: 'email', // Student Number + Email
  FALLBACK: 'name' // Student Number + First Name + Last Name
} as const

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
// BUSINESS RULES (From Documentation)
// ============================================================================

export const ATTENDANCE_RULES = {
  MAX_REASSIGNMENT_REQUESTS: 3, // Per student lifetime
  REASSIGNMENT_SCOPE: 'same_class_same_day', // Within same class, same day only
  QR_SCAN_WINDOW: {
    BEFORE_SESSION: 30 * 60 * 1000, // 30 minutes before session
    AFTER_SESSION: 0 // No grace period after session ends
  },
  MULTI_SCAN_BEHAVIOR: 'single_record_with_alert',
  WEEKEND_DAYS: ['SATURDAY', 'SUNDAY'] as const,
  SESSION_REQUIREMENTS: {
    SATURDAY_AND_SUNDAY: true, // Students must attend both days
    SAME_CLASS_ONLY: true // Saturday and Sunday sessions must be in same class
  }
} as const

export const COURSE_RULES = {
  HEAD_TEACHER_REQUIRED: true,
  SIMULTANEOUS_CREATION: true, // Course + Head Teacher created together
  DEACTIVATION_ON_HEAD_REMOVAL: true,
  MULTIPLE_CLASSES_ALLOWED: true,
  END_DATE_DECLARATION: 'admin_only'
} as const

export const SESSION_RULES = {
  DAYS_ALLOWED: ['SATURDAY', 'SUNDAY'] as const,
  NO_OVERLAP: true, // Sessions cannot overlap in time within same class/day
  CAPACITY_ENFORCEMENT: true,
  TIME_MODIFICATION: 'teacher_only',
  REASONABLE_HOURS: {
    MIN_START: '06:00',
    MAX_END: '22:00'
  },
  MIN_DURATION: 60, // minutes
  MAX_DURATION: 8 * 60 // 8 hours in minutes
} as const

export const CLASS_RULES = {
  SATURDAY_SUNDAY_SESSIONS: true, // Each class must have both days
  CAPACITY_LIMITS: {
    MIN: 1,
    MAX: 100,
    DEFAULT: 25
  },
  HEAD_TEACHER_CREATION_ONLY: true
} as const

// ============================================================================
// ATTENDANCE STATUS & STATES
// ============================================================================

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

export const COURSE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  COMPLETED: 'COMPLETED'
} as const

export const WEEK_DAYS = {
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY'
} as const

// ============================================================================
// API CONFIGURATION
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
  STUDENT_RESET_PASSWORD: '/api/students/reset-password',
  
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
    MAX_NOTIFICATIONS: 5,
    POSITION: 'top-right' as const
  },
  
  MODALS: {
    DEFAULT_SIZE: 'md' as const,
    SIZES: ['sm', 'md', 'lg', 'xl'] as const,
    CLOSE_ON_BACKDROP: true,
    CLOSE_ON_ESCAPE: true
  },
  
  TABLES: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZES: [10, 20, 50, 100] as const
  },
  
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536
  },
  
  THEME: {
    DEFAULT: 'system' as const,
    OPTIONS: ['light', 'dark', 'system'] as const
  }
} as const

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254,
    DOMAIN_BLOCKLIST: ['tempmail.com', '10minutemail.com'] // Add suspicious domains
  },
  
  PHONE: {
    REGEX: /^[\+]?[1-9][\d]{0,15}$/, // International format
    LOCAL_REGEX: /^(\+254|254|0)?[1-9]\d{8}$/, // Kenya format example
    MIN_LENGTH: 10,
    MAX_LENGTH: 15
  },
  
  STUDENT_NUMBER: {
    REGEX: /^[A-Z0-9]{3,20}$/,
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    REQUIRED: true
  },
  
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z\s\-'\.]+$/, // Allow letters, spaces, hyphens, apostrophes, dots
    REQUIRED: true
  },
  
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL: false
  },
  
  CLASS_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REGEX: /^[a-zA-Z0-9\s\-_]+$/
  },
  
  COURSE_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    REGEX: /^[a-zA-Z0-9\s\-_&()]+$/
  },
  
  SESSION_TIME: {
    FORMAT: 'HH:MM',
    REGEX: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  }
} as const

// ============================================================================
// EXCEL IMPORT CONFIGURATION
// ============================================================================

export const EXCEL_IMPORT = {
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.csv'] as const,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 1000,
  REQUIRED_COLUMNS: [
    'student_number',
    'first_name', 
    'last_name',
    'email'
  ] as const,
  OPTIONAL_COLUMNS: [
    'phone_number'
  ] as const,
  ALTERNATIVE_HEADERS: {
    'student_number': ['Student Number', 'Student ID', 'ID'],
    'first_name': ['First Name', 'FirstName', 'Given Name'],
    'last_name': ['Last Name', 'LastName', 'Surname', 'Family Name'],
    'email': ['Email', 'Email Address', 'E-mail'],
    'phone_number': ['Phone Number', 'Phone', 'Mobile', 'Contact']
  } as const,
  BATCH_SIZE: 50 // Process students in batches
} as const

// ============================================================================
// QR CODE CONFIGURATION
// ============================================================================

export const QR_CONFIG = {
  DEFAULT_SETTINGS: {
    SIZE: 256,
    ERROR_CORRECTION_LEVEL: 'M' as const,
    MARGIN: 1,
    DARK_COLOR: '#000000',
    LIGHT_COLOR: '#FFFFFF'
  },
  
  ERROR_CORRECTION_LEVELS: ['L', 'M', 'Q', 'H'] as const,
  SIZE_OPTIONS: [128, 256, 512, 1024] as const,
  
  GENERATION_LIMITS: {
    COOLDOWN_PERIOD: 5 * 60 * 1000, // 5 minutes between generations
    DAILY_LIMIT: 50, // Maximum QR generations per day
    VALIDITY_PERIOD: 24 * 60 * 60 * 1000 // QR valid for 24 hours
  },
  
  DATA_FORMAT: {
    KEYS: ['uuid', 'student_id'] as const,
    ENCODING: 'UTF-8'
  }
} as const

// ============================================================================
// OFFLINE SYNC CONFIGURATION
// ============================================================================

export const OFFLINE_CONFIG = {
  SYNC_INTERVAL: 30 * 1000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 5000, 15000], // Progressive delays in ms
  MAX_PENDING_ITEMS: 100,
  STORAGE_QUOTA_WARNING: 0.8, // Warn when 80% of storage used
  
  CONNECTION_CHECK: {
    INTERVAL: 5000, // Check connection every 5 seconds
    TIMEOUT: 3000, // Network request timeout
    TEST_URL: '/api/health' // Endpoint to test connectivity
  },
  
  BATCH_SYNC: {
    SIZE: 10, // Sync 10 items at once
    DELAY: 1000 // 1 second delay between batches
  }
} as const

// ============================================================================
// TIMING & SCHEDULING
// ============================================================================

export const TIME_CONFIG = {
  FORMATS: {
    TIME_24H: 'HH:mm',
    TIME_12H: 'h:mm a',
    DATE: 'yyyy-MM-dd',
    DATETIME: 'yyyy-MM-dd HH:mm:ss',
    DISPLAY_DATE: 'MMM d, yyyy',
    DISPLAY_DATETIME: 'MMM d, yyyy h:mm a'
  },
  
  TIMEZONE: 'Africa/Nairobi', // Default timezone for Kenya
  
  SESSION_CONSTRAINTS: {
    MIN_DURATION_MINUTES: 60,
    MAX_DURATION_MINUTES: 480, // 8 hours
    BUFFER_BETWEEN_SESSIONS: 15, // 15 minutes buffer
    EARLIEST_START: '06:00',
    LATEST_END: '22:00'
  },
  
  ATTENDANCE_WINDOWS: {
    QR_GENERATION_BEFORE: 30, // 30 minutes before session
    QR_SCAN_AFTER: 0, // No grace period after session
    LATE_THRESHOLD: 15, // Mark as late if 15+ minutes after start
    ABSENCE_MARKING_DELAY: 24 * 60 // Mark absent 24 hours after session
  }
} as const

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You do not have permission to perform this action',
    ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts'
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
    MAX_REQUESTS_REACHED: 'Maximum reassignment requests (3) reached',
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
  
  QR: {
    GENERATED: 'QR code generated successfully',
    DOWNLOADED: 'QR code downloaded successfully'
  },
  
  REASSIGNMENT: {
    REQUESTED: 'Reassignment request submitted successfully',
    APPROVED: 'Reassignment request approved',
    DENIED: 'Reassignment request denied',
    CANCELLED: 'Reassignment request cancelled'
  }
} as const

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULTS = {
  CLASS_CAPACITY: 25,
  SESSION_DURATION: 120, // 2 hours in minutes
  PAGINATION_LIMIT: 20,
  QR_SIZE: 256,
  NOTIFICATION_DURATION: 5000,
  SYNC_INTERVAL: 30000,
  SESSION_EXTENSION_TIME: 8 * 60 * 60 * 1000, // 8 hours
  MAX_REASSIGNMENT_REQUESTS: 3
} as const

// Type exports for strict typing
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type TeacherRole = typeof TEACHER_ROLES[keyof typeof TEACHER_ROLES]
export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS]
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS]
export type CourseStatus = typeof COURSE_STATUS[keyof typeof COURSE_STATUS]
export type WeekDay = typeof WEEK_DAYS[keyof typeof WEEK_DAYS]
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES]
