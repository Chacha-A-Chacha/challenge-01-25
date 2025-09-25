// types/hooks.ts
import type { AttendanceStatus, NotificationType } from './enums'
import type { Student, Session } from './database'
import type { AttendanceRecord, AttendanceStats } from './business'
import type { StudentImportData, StudentImportResult, FieldProps } from './forms'
import type { Notification } from './ui'

export interface UseAttendanceReturn {
  // Data
  attendanceData: AttendanceRecord[]
  stats: AttendanceStats
  currentSession: Session | null
  
  // State
  isLoading: boolean
  error: string | null
  isScanning: boolean
  
  // Actions
  scanQRCode: (qrData: string) => Promise<boolean>
  markManualAttendance: (studentId: string, status: AttendanceStatus) => Promise<void>
  bulkMarkAbsent: (studentIds: string[]) => Promise<void>
  setCurrentSession: (session: Session | null) => void
  refetch: () => void
  
  // Computed
  getPresentCount: () => number
  getAbsentCount: () => number
  getAttendanceRate: () => number
}

export interface UseQRScannerReturn {
  // State
  isScanning: boolean
  hasPermission: boolean
  error: string | null
  
  // Refs
  videoRef: React.RefObject<HTMLVideoElement>
  
  // Actions
  startScanning: () => Promise<boolean>
  stopScanning: () => void
  requestPermission: () => Promise<boolean>
  
  // Config
  facingMode: 'user' | 'environment'
  setFacingMode: (mode: 'user' | 'environment') => void
}

export interface UseStudentImportReturn {
  // State
  isImporting: boolean
  importProgress: number
  importResult: StudentImportResult | null
  validationErrors: string[]
  
  // Actions
  importStudents: (file: File, classId: string) => Promise<boolean>
  previewFile: (file: File) => Promise<StudentImportData[]>
  validateFile: (file: File) => string | null
  clearResults: () => void
  
  // Helpers
  downloadTemplate: () => void
  generateCredentialsFile: (students: Student[]) => void
}

export interface UseFormReturn<T> {
  // State
  values: Partial<T>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isValidating: boolean
  isValid: boolean
  hasErrors: boolean
  isDirty: boolean
  
  // Actions
  setValue: (name: keyof T, value: unknown) => void
  setValues: (values: Partial<T>) => void
  setError: (name: keyof T, error: string) => void
  clearErrors: () => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: (newValues?: Partial<T>) => void
  
  // Helpers
  getFieldProps: (name: keyof T) => FieldProps
  validateField: (name: keyof T) => Promise<boolean>
  validateForm: () => Promise<boolean>
}

export interface UsePermissionsReturn {
  // State
  permissions: Record<string, boolean>
  isLoading: boolean
  
  // Checks
  hasPermission: (permission: string) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  
  // Role checks
  canCreateCourse: boolean
  canManageSystem: boolean
  canImportStudents: boolean
  canScanAttendance: boolean
  canGenerateQR: boolean
  canRequestReassignment: boolean
}

export interface UseNotificationsReturn {
  // State
  notifications: Notification[]
  
  // Actions
  show: (type: NotificationType, title: string, message: string, duration?: number) => string
  showSuccess: (title: string, message: string, duration?: number) => string
  showError: (title: string, message: string, duration?: number) => string
  showWarning: (title: string, message: string, duration?: number) => string
  showInfo: (title: string, message: string, duration?: number) => string
  remove: (id: string) => void
  clear: () => void
  clearByType: (type: NotificationType) => void
  
  // Convenience
  showLoadingSuccess: (message?: string) => string
  showLoadingError: (message?: string) => string
  showValidationError: (message?: string) => string
  showNetworkError: () => string
  showPermissionError: () => string
}
