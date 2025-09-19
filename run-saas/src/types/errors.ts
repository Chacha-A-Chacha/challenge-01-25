// types/errors.ts

export interface AppError extends Error {
  code: string
  status?: number
  details?: Record<string, unknown>
  timestamp?: Date
}

export interface ValidationErrorDetail {
  field: string
  message: string
  code: string
  value?: unknown
}

export interface QRScanError {
  type: 'PERMISSION_DENIED' | 'INVALID_QR' | 'WRONG_SESSION' | 'ALREADY_SCANNED' | 'OUTSIDE_WINDOW' | 'STUDENT_NOT_FOUND'
  message: string
  studentId?: string
  sessionId?: string
  details?: Record<string, unknown>
}

export interface DatabaseError {
  operation: 'create' | 'read' | 'update' | 'delete'
  table: string
  constraint?: string
  message: string
  originalError?: unknown
}

export interface ImportValidationError {
  row: number
  field: string
  message: string
  value: string
  code: string
}

export interface FileUploadError {
  type: 'SIZE_EXCEEDED' | 'INVALID_FORMAT' | 'CORRUPTED' | 'PERMISSION_DENIED'
  message: string
  fileName: string
  fileSize?: number
  maxSize?: number
}

export interface NetworkError {
  type: 'TIMEOUT' | 'CONNECTION_LOST' | 'SERVER_ERROR' | 'RATE_LIMITED'
  message: string
  status?: number
  retryAfter?: number
}

export interface AuthenticationError {
  type: 'INVALID_CREDENTIALS' | 'SESSION_EXPIRED' | 'ACCOUNT_LOCKED' | 'PERMISSION_DENIED'
  message: string
  remainingAttempts?: number
  lockoutDuration?: number
}
