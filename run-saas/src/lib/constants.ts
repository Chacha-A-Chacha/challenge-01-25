// lib/constants.ts

export const VALIDATION_RULES = {
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254,
  },

  PHONE: {
    LOCAL_REGEX: /^(\+254|254|0)?[1-9]\d{8}$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },

  STUDENT_NUMBER: {
    REGEX: /^[A-Z0-9]{3,20}$/,
    MIN_LENGTH: 4,
    MAX_LENGTH: 6,
  },

  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z\s\-'\.]+$/,
  },

  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
  },

  RECEIPT_NUMBER: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 20,
    REGEX: /^\d+$/,
  },
} as const;

export const SESSION_RULES = {
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 240,
  EARLY_ENTRY_MINUTES: 15,
  LATE_ENTRY_MINUTES: 30,
  MIN_START_TIME: "08:00",
  MAX_END_TIME: "18:00",
  QR_GENERATION_WINDOW_MINUTES: 30,
} as const;

export const CLASS_RULES = {
  MAX_CAPACITY: 100,
  DEFAULT_CAPACITY: 30,
} as const;

export const ATTENDANCE_RULES = {
  MAX_REASSIGNMENT_REQUESTS: 3,
  AUTO_MARK_ABSENT_DELAY_HOURS: 4,
} as const;

export const REGISTRATION_RULES = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB for receipt image
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  AUTO_EXPIRE_DAYS: 7,
} as const;

export const EXCEL_IMPORT = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  BATCH_SIZE: 100,
  MAX_ROWS: 1000,
  ALLOWED_EXTENSIONS: [".xlsx", ".xls", ".csv"],

  REQUIRED_COLUMNS: ["student_number", "first_name", "email"],

  OPTIONAL_COLUMNS: ["last_name", "phone_number"],
} as const;

export const QR_CONFIG = {
  SIZE: 256,
  ERROR_CORRECTION_LEVEL: "M" as const,
  MARGIN: 4,
  DATA_FORMAT: {
    VERSION: "1.0",
    REQUIRED_FIELDS: ["uuid", "student_id"] as const,
  },
} as const;

export const API_ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: "/api/auth/signin",
    LOGOUT: "/api/auth/signout",
    SESSION: "/api/auth/session",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    CHANGE_PASSWORD: "/api/auth/change-password",
  },

  // Core entities
  COURSES: "/api/courses",
  TEACHERS: "/api/teachers",
  CLASSES: "/api/teacher/classes",
  SESSIONS: "/api/teacher/sessions",
  STUDENTS: "/api/students",

  // Operations
  STUDENTS_IMPORT: "/api/students/import",
  STUDENTS_AUTO_ASSIGN: "/api/students/auto-assign",
  ATTENDANCE_SCAN: "/api/attendance/scan",

  // Student portal
  STUDENT: {
    SCHEDULE: "/api/student/schedule",
    ATTENDANCE: "/api/student/attendance",
    QR_GENERATE: "/api/student/qr-generate",
    REASSIGNMENT_REQUESTS: "/api/student/reassignment-requests",
  },

  // Admin-specific routes
  ADMIN: {
    STATS: "/api/admin/stats",
    TEACHERS: "/api/admin/teachers",
    HEALTH_CHECK: "/api/admin/health",
  },

  // Registration (public)
  REGISTER: {
    SUBMIT: "/api/register",
    COURSES: "/api/register/courses",
    CLASSES: (courseId: string) => `/api/register/courses/${courseId}/classes`, // NEW
    SESSIONS: (courseId: string, classId: string) =>
      `/api/register/courses/${courseId}/classes/${classId}/sessions`, // UPDATED - now requires classId
    UPLOAD: "/api/register/upload",
  },

  // Teacher registration management
  TEACHER: {
    REGISTRATIONS: "/api/teacher/registrations",
    REGISTRATION_DETAIL: (id: string) => `/api/teacher/registrations/${id}`,
    APPROVE: (id: string) => `/api/teacher/registrations/${id}/approve`,
    REJECT: (id: string) => `/api/teacher/registrations/${id}/reject`,
    BULK_APPROVE: "/api/teacher/registrations/bulk-approve",
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PERMISSIONS = {
  // Admin permissions
  CREATE_COURSE: "create_course",
  MANAGE_SYSTEM: "manage_system",
  REMOVE_HEAD_TEACHER: "remove_head_teacher",
  VIEW_ALL_COURSES: "view_all_courses",
  MANAGE_TEACHERS: "manage_teachers",

  // Head teacher permissions
  ADD_TEACHER: "add_teacher",
  REMOVE_TEACHER: "remove_teacher",
  CREATE_CLASS: "create_class",
  MANAGE_COURSE: "manage_course",

  // All teacher permissions
  IMPORT_STUDENTS: "import_students",
  SCAN_ATTENDANCE: "scan_attendance",
  CREATE_SESSION: "create_session",
  APPROVE_REASSIGNMENT: "approve_reassignment",
  MARK_ATTENDANCE: "mark_attendance",
  VIEW_REGISTRATIONS: "view_registrations",
  APPROVE_REGISTRATION: "approve_registration",

  // Student permissions
  GENERATE_QR: "generate_qr",
  VIEW_OWN_ATTENDANCE: "view_own_attendance",
  REQUEST_REASSIGNMENT: "request_reassignment",
  VIEW_SCHEDULE: "view_schedule",
} as const;

export const EMAIL_CONFIG = {
  SUPPORT_EMAIL: "support@weekendacademy.com",
  NO_REPLY_EMAIL: "noreply@weekendacademy.com",

  SUBJECTS: {
    PASSWORD_RESET: "Reset Your Password - Weekend Academy",
    PASSWORD_CHANGED: "Password Changed Successfully - Weekend Academy",
    REGISTRATION_APPROVED:
      "Registration Approved - Welcome to Weekend Academy!",
    REGISTRATION_REJECTED: "Registration Update - Weekend Academy",
    WELCOME_STAFF: "Welcome to Weekend Academy - Staff Account Created",
    WELCOME_ADMIN: "Welcome to Weekend Academy - Admin Account Created",
  },

  RESET_TOKEN: {
    EXPIRY_MINUTES: 60, // 1 hour
    LENGTH: 32, // bytes
  },
} as const;

export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: "Invalid email or password",
    SESSION_EXPIRED: "Your session has expired. Please log in again.",
    UNAUTHORIZED: "You do not have permission to perform this action",
  },

  VALIDATION: {
    REQUIRED_FIELD: "This field is required",
    INVALID_EMAIL: "Please enter a valid email address",
    INVALID_PHONE: "Please enter a valid phone number",
    INVALID_STUDENT_NUMBER:
      "Student number must be 3-6 characters (letters and numbers only)",
    PASSWORDS_DONT_MATCH: "Passwords do not match",
    INVALID_RECEIPT_NUMBER: "Receipt number must contain only digits",
  },

  ATTENDANCE: {
    OUTSIDE_SESSION_TIME: "QR scanning is only allowed during session hours",
    ALREADY_MARKED: "Attendance already marked for this session",
    WRONG_SESSION: "Student scanned in wrong session",
    STUDENT_NOT_FOUND: "Student not found",
  },

  FILE_UPLOAD: {
    FILE_TOO_LARGE: "File size exceeds 5MB limit",
    INVALID_FORMAT: "Only .xlsx, .xls, and .csv files are allowed",
    INVALID_IMAGE_FORMAT: "Only JPEG, PNG, and WebP images are allowed",
    PARSING_FAILED: "Failed to parse Excel file",
    CORRUPTED_FILE: "File appears to be corrupted",
  },

  REASSIGNMENT: {
    PENDING_REQUEST_EXISTS: "You already have a pending reassignment request",
    MAX_REQUESTS_REACHED: "Maximum reassignment requests reached (3 limit)",
    SAME_DAY_ONLY: "Can only reassign within the same day sessions",
    SAME_CLASS_ONLY: "Can only reassign within the same class",
    SESSION_FULL: "Target session is at full capacity",
  },

  REGISTRATION: {
    EMAIL_EXISTS: "An account with this email already exists",
    SESSION_FULL: "Selected session is at full capacity",
    COURSE_NOT_ACTIVE: "This course is not currently accepting registrations",
    ALREADY_PROCESSED: "This registration has already been processed",
    NOT_FOUND: "Registration not found",
  },

  EMAIL: {
    SEND_FAILED: "Failed to send email. Please try again.",
    INVALID_TOKEN: "Invalid or expired reset token",
    TOKEN_EXPIRED: "Reset link has expired. Please request a new one.",
    USER_NOT_FOUND: "No account found with this email address",
    INVALID_CURRENT_PASSWORD: "Current password is incorrect",
  },
} as const;

export const UI_CONFIG = {
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  NOTIFICATIONS: {
    DEFAULT_DURATION: 5000,
    ERROR_DURATION: 6000,
    MAX_NOTIFICATIONS: 5,
  },
} as const;

export const REQUEST_TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  FILE_UPLOAD: 60000, // 1 minute
  QR_SCAN: 5000, // 5 seconds
} as const;
