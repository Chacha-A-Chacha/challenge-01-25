// lib/utils.ts

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { 
  VALIDATION_RULES, 
  TIME_CONFIG, 
  AUTH_CONFIG,
  QR_CONFIG,
  EXCEL_IMPORT,
  API_ROUTES,
  HTTP_STATUS,
  REQUEST_TIMEOUTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ATTENDANCE_RULES,
  SESSION_RULES
} from './constants'
import type { 
  ApiResponse, 
  ValidationError, 
  StudentImportData,
  AttendanceStatus,
  WeekDay 
} from '@/types'

// ============================================================================
// STYLING UTILITIES (DRY for className handling)
// ============================================================================

/**
 * Merge Tailwind classes with clsx
 * Used across all components to prevent className conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate consistent status colors
 * Used in attendance displays, request statuses, etc.
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Attendance statuses
    'PRESENT': 'text-green-600 bg-green-50',
    'ABSENT': 'text-red-600 bg-red-50',
    'WRONG_SESSION': 'text-yellow-600 bg-yellow-50',
    
    // Request statuses
    'PENDING': 'text-blue-600 bg-blue-50',
    'APPROVED': 'text-green-600 bg-green-50',
    'DENIED': 'text-red-600 bg-red-50',
    
    // Course statuses
    'ACTIVE': 'text-green-600 bg-green-50',
    'INACTIVE': 'text-gray-600 bg-gray-50',
    'COMPLETED': 'text-blue-600 bg-blue-50'
  }
  
  return statusColors[status] || 'text-gray-600 bg-gray-50'
}

// ============================================================================
// DATE & TIME UTILITIES (DRY for time handling)
// ============================================================================

/**
 * Get start and end of day for consistent date filtering
 * Used in attendance queries, session filtering, etc.
 */
export function getDayBounds(date: Date = new Date()) {
  const start = new Date(date.toDateString())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/**
 * Parse time string to minutes since midnight
 * Used in session validation, scheduling, QR timing
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes to time string
 * Used in session displays, scheduling
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Check if current time is within session window
 * Used in QR generation, attendance validation
 */
export function isWithinSessionTime(
  sessionStart: string, 
  sessionEnd: string, 
  bufferMinutes: number = 0
): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = parseTimeToMinutes(sessionStart) - bufferMinutes
  const endMinutes = parseTimeToMinutes(sessionEnd)
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * Get next occurrence of a specific day
 * Used in session scheduling, countdown calculations
 */
export function getNextOccurrence(targetDay: WeekDay, referenceDate: Date = new Date()): Date {
  const dayMap = { SATURDAY: 6, SUNDAY: 0 }
  const targetDayNum = dayMap[targetDay]
  const currentDay = referenceDate.getDay()
  
  let daysUntil = targetDayNum - currentDay
  if (daysUntil <= 0) daysUntil += 7
  
  const nextDate = new Date(referenceDate)
  nextDate.setDate(referenceDate.getDate() + daysUntil)
  return nextDate
}

/**
 * Format duration between dates
 * Used in session countdowns, time displays
 */
export function formatDuration(milliseconds: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return { hours, minutes, seconds }
}

/**
 * Check if two time ranges overlap
 * Used in session validation, scheduling conflicts
 */
export function timeRangesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const start1Min = parseTimeToMinutes(start1)
  const end1Min = parseTimeToMinutes(end1)
  const start2Min = parseTimeToMinutes(start2)
  const end2Min = parseTimeToMinutes(end2)
  
  return start1Min < end2Min && start2Min < end1Min
}

// ============================================================================
// VALIDATION UTILITIES (DRY for form validation)
// ============================================================================

/**
 * Validate email format
 * Used in authentication, student imports, teacher creation
 */
export function validateEmail(email: string): ValidationError | null {
  if (!email) {
    return { field: 'email', message: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD }
  }
  
  if (!VALIDATION_RULES.EMAIL.REGEX.test(email)) {
    return { field: 'email', message: ERROR_MESSAGES.VALIDATION.INVALID_EMAIL }
  }
  
  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    return { field: 'email', message: `Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters` }
  }
  
  // Check domain blocklist
  const domain = email.split('@')[1]?.toLowerCase()
  if (domain && VALIDATION_RULES.EMAIL.DOMAIN_BLOCKLIST.includes(domain)) {
    return { field: 'email', message: 'This email domain is not allowed' }
  }
  
  return null
}

/**
 * Validate phone number format
 * Used in student authentication, imports
 */
export function validatePhoneNumber(phone: string): ValidationError | null {
  if (!phone) return null // Phone is optional
  
  const cleanPhone = phone.replace(/\s/g, '')
  
  if (!VALIDATION_RULES.PHONE.REGEX.test(cleanPhone)) {
    return { field: 'phoneNumber', message: ERROR_MESSAGES.VALIDATION.INVALID_PHONE }
  }
  
  return null
}

/**
 * Validate student number format
 * Used in student imports, authentication
 */
export function validateStudentNumber(studentNumber: string): ValidationError | null {
  if (!studentNumber) {
    return { field: 'studentNumber', message: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD }
  }
  
  if (!VALIDATION_RULES.STUDENT_NUMBER.REGEX.test(studentNumber)) {
    return { field: 'studentNumber', message: ERROR_MESSAGES.VALIDATION.INVALID_STUDENT_NUMBER }
  }
  
  return null
}

/**
 * Validate name format
 * Used in student imports, teacher creation
 */
export function validateName(name: string, fieldName: string = 'name'): ValidationError | null {
  if (!name) {
    return { field: fieldName, message: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD }
  }
  
  if (name.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return { field: fieldName, message: `${fieldName} must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters` }
  }
  
  if (name.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return { field: fieldName, message: `${fieldName} must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters` }
  }
  
  if (!VALIDATION_RULES.NAME.REGEX.test(name)) {
    return { field: fieldName, message: `${fieldName} contains invalid characters` }
  }
  
  return null
}

/**
 * Validate password strength
 * Used in teacher/admin creation, password resets
 */
export function validatePassword(password: string): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!password) {
    errors.push({ field: 'password', message: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD })
    return errors
  }
  
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push({ field: 'password', message: ERROR_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT })
  }
  
  const requirements = AUTH_CONFIG.PASSWORD_REQUIREMENTS
  
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain uppercase letters' })
  }
  
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain lowercase letters' })
  }
  
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain numbers' })
  }
  
  if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain special characters' })
  }
  
  return errors
}

/**
 * Validate session time format and constraints
 * Used in session creation, editing
 */
export function validateSessionTime(startTime: string, endTime: string): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Format validation
  if (!VALIDATION_RULES.SESSION_TIME.REGEX.test(startTime)) {
    errors.push({ field: 'startTime', message: 'Invalid start time format (use HH:MM)' })
  }
  
  if (!VALIDATION_RULES.SESSION_TIME.REGEX.test(endTime)) {
    errors.push({ field: 'endTime', message: 'Invalid end time format (use HH:MM)' })
  }
  
  if (errors.length > 0) return errors
  
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  const duration = endMinutes - startMinutes
  
  // Duration validation
  if (duration <= 0) {
    errors.push({ field: 'endTime', message: 'End time must be after start time' })
  }
  
  if (duration < SESSION_RULES.MIN_DURATION) {
    errors.push({ field: 'endTime', message: `Session must be at least ${SESSION_RULES.MIN_DURATION} minutes` })
  }
  
  if (duration > SESSION_RULES.MAX_DURATION) {
    errors.push({ field: 'endTime', message: `Session cannot exceed ${SESSION_RULES.MAX_DURATION / 60} hours` })
  }
  
  // Time constraints
  const earliestStart = parseTimeToMinutes(SESSION_RULES.REASONABLE_HOURS.MIN_START)
  const latestEnd = parseTimeToMinutes(SESSION_RULES.REASONABLE_HOURS.MAX_END)
  
  if (startMinutes < earliestStart) {
    errors.push({ field: 'startTime', message: `Sessions cannot start before ${SESSION_RULES.REASONABLE_HOURS.MIN_START}` })
  }
  
  if (endMinutes > latestEnd) {
    errors.push({ field: 'endTime', message: `Sessions cannot end after ${SESSION_RULES.REASONABLE_HOURS.MAX_END}` })
  }
  
  return errors
}

// ============================================================================
// AUTH UTILITIES (DRY for authentication)
// ============================================================================

/**
 * Generate secure random password
 * Used in teacher creation, password resets
 */
export function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols
  
  let password = ''
  
  // Ensure at least one character from each required set
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  
  // Fill the rest randomly
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Hash password using bcrypt
 * Used in user creation, password updates
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

/**
 * Verify password against hash
 * Used in authentication
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

// ============================================================================
// API UTILITIES (DRY for API interactions)
// ============================================================================

/**
 * Create standardized API response
 * Used in all API routes
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    message,
    error
  }
}

/**
 * Handle API errors consistently
 * Used in all API routes and stores
 */
export function handleApiError(error: unknown): ApiResponse {
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    return createApiResponse(false, undefined, undefined, error.message)
  }
  
  return createApiResponse(false, undefined, undefined, 'An unexpected error occurred')
}

/**
 * Create fetch wrapper with timeout and error handling
 * Used in all store API calls
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUTS.DEFAULT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Parse and validate API response
 * Used in all store API calls
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json()
    
    if (!response.ok) {
      return createApiResponse(false, undefined, undefined, data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    return createApiResponse(false, undefined, undefined, 'Failed to parse response')
  }
}

// ============================================================================
// FILE UTILITIES (DRY for file operations)
// ============================================================================

/**
 * Validate file for Excel import
 * Used in student import, data export
 */
export function validateImportFile(file: File): ValidationError | null {
  // Check file size
  if (file.size > EXCEL_IMPORT.MAX_FILE_SIZE) {
    return { field: 'file', message: ERROR_MESSAGES.FILE_UPLOAD.FILE_TOO_LARGE }
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!EXCEL_IMPORT.ALLOWED_EXTENSIONS.includes(extension as any)) {
    return { field: 'file', message: ERROR_MESSAGES.FILE_UPLOAD.INVALID_FORMAT }
  }
  
  return null
}

/**
 * Parse Excel/CSV file to JSON
 * Used in student imports
 */
export async function parseExcelFile(file: File): Promise<StudentImportData[]> {
  const XLSX = await import('xlsx')
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        const studentData: StudentImportData[] = jsonData.map((row: any) => {
          // Handle alternative column headers
          const getFieldValue = (field: string) => {
            const alternatives = EXCEL_IMPORT.ALTERNATIVE_HEADERS[field as keyof typeof EXCEL_IMPORT.ALTERNATIVE_HEADERS]
            
            // Try exact field name first
            if (row[field]) return row[field]
            
            // Try alternatives
            for (const alt of alternatives) {
              if (row[alt]) return row[alt]
            }
            
            return ''
          }
          
          return {
            student_number: getFieldValue('student_number'),
            first_name: getFieldValue('first_name'),
            last_name: getFieldValue('last_name'),
            email: getFieldValue('email'),
            phone_number: getFieldValue('phone_number')
          }
        })
        
        resolve(studentData)
      } catch (error) {
        reject(new Error(ERROR_MESSAGES.FILE_UPLOAD.PARSING_FAILED))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Download data as CSV file
 * Used in data exports, credential downloads
 */
export function downloadCSV(data: any[], filename: string): void {
  if (data.length === 0) return
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || ''
        // Escape values containing commas or quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// ============================================================================
// QR CODE UTILITIES (DRY for QR operations)
// ============================================================================

/**
 * Generate QR code data URL
 * Used in student QR generation
 */
export async function generateQRCode(
  data: { uuid: string; student_id: string },
  settings = QR_CONFIG.DEFAULT_SETTINGS
): Promise<string> {
  const QRCode = await import('qrcode')
  const qrDataString = JSON.stringify(data)
  
  return QRCode.toDataURL(qrDataString, {
    errorCorrectionLevel: settings.ERROR_CORRECTION_LEVEL,
    type: 'image/png',
    quality: 0.92,
    margin: settings.MARGIN,
    width: settings.SIZE,
    color: {
      dark: settings.DARK_COLOR,
      light: settings.LIGHT_COLOR
    }
  })
}

/**
 * Validate QR code data format
 * Used in attendance scanning
 */
export function validateQRData(qrString: string): { uuid: string; student_id: string } | null {
  try {
    const data = JSON.parse(qrString)
    
    if (!data.uuid || !data.student_id) {
      return null
    }
    
    return {
      uuid: data.uuid,
      student_id: data.student_id
    }
  } catch (error) {
    return null
  }
}

// ============================================================================
// BUSINESS LOGIC UTILITIES (DRY for domain logic)
// ============================================================================

/**
 * Calculate attendance rate
 * Used in statistics, reports
 */
export function calculateAttendanceRate(present: number, total: number): number {
  if (total === 0) return 0
  return Math.round((present / total) * 100)
}

/**
 * Check if student can generate QR code
 * Used in student portal, QR store
 */
export function canGenerateQR(
  saturdaySession: { day: WeekDay; startTime: string; endTime: string } | null,
  sundaySession: { day: WeekDay; startTime: string; endTime: string } | null
): boolean {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
  
  // Check if it's Saturday and within QR generation window
  if (currentDay === 6 && saturdaySession) {
    return isWithinSessionTime(
      saturdaySession.startTime,
      saturdaySession.endTime,
      ATTENDANCE_RULES.QR_SCAN_WINDOW.BEFORE_SESSION / (60 * 1000) // Convert to minutes
    )
  }
  
  // Check if it's Sunday and within QR generation window
  if (currentDay === 0 && sundaySession) {
    return isWithinSessionTime(
      sundaySession.startTime,
      sundaySession.endTime,
      ATTENDANCE_RULES.QR_SCAN_WINDOW.BEFORE_SESSION / (60 * 1000) // Convert to minutes
    )
  }
  
  return false
}

/**
 * Get session status based on current time
 * Used in session displays, scheduling
 */
export function getSessionStatus(session: { day: WeekDay; startTime: string; endTime: string }): 
  'upcoming' | 'current' | 'completed' {
  const now = new Date()
  const currentDay = now.getDay()
  const sessionDay = session.day === 'SATURDAY' ? 6 : 0
  
  if (currentDay !== sessionDay) {
    return currentDay < sessionDay || (currentDay > sessionDay && sessionDay === 0) ? 'upcoming' : 'completed'
  }
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = parseTimeToMinutes(session.startTime)
  const endMinutes = parseTimeToMinutes(session.endTime)
  
  if (currentMinutes < startMinutes) return 'upcoming'
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return 'current'
  return 'completed'
}

// ============================================================================
// FORMAT UTILITIES (DRY for display formatting)
// ============================================================================

/**
 * Format student name consistently
 * Used in displays, exports
 */
export function formatStudentName(firstName: string, lastName?: string): string {
  return lastName ? `${firstName} ${lastName}` : firstName
}

/**
 * Format session time range
 * Used in schedules, session displays
 */
export function formatSessionTime(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`
}

/**
 * Format capacity display
 * Used in session lists, capacity indicators
 */
export function formatCapacity(current: number, max: number): string {
  return `${current}/${max}`
}

/**
 * Truncate text with ellipsis
 * Used in tables, cards with limited space
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Format phone number for display
 * Used in student information displays
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Simple formatting for display (can be enhanced for specific regions)
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return phone // Return original if format doesn't match
}

// ============================================================================
// DEBOUNCE & THROTTLE UTILITIES (DRY for performance)
// ============================================================================

/**
 * Debounce function calls
 * Used in search inputs, form validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function calls
 * Used in scroll handlers, resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// ============================================================================
// STORAGE UTILITIES (DRY for client storage)
// ============================================================================

/**
 * Safe localStorage wrapper
 * Used in stores for persistent data
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue
    
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.clear()
  }
}

// ============================================================================
// ARRAY UTILITIES (DRY for data manipulation)
// ============================================================================

/**
 * Group array items by key
 * Used in attendance grouping, statistics
 */
export function groupBy<T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = getKey(item)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<K, T[]>)
}

/**
 * Remove duplicates from array
 * Used in data processing, filtering
 */
export function uniqueBy<T, K>(array: T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>()
  return array.filter(item => {
    const key = getKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Sort array by multiple criteria
 * Used in data tables, lists
 */
export function sortBy<T>(
  array: T[],
  ...criteria: Array<(item: T) => any>
): T[] {
  return [...array].sort((a, b) => {
    for (const criterion of criteria) {
      const aVal = criterion(a)
      const bVal = criterion(b)
      
      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
    }
    return 0
  })
}

// Export commonly used patterns as constants
export const COMMON_PATTERNS = {
  EMAIL_REGEX: VALIDATION_RULES.EMAIL.REGEX,
  PHONE_REGEX: VALIDATION_RULES.PHONE.REGEX,
  STUDENT_NUMBER_REGEX: VALIDATION_RULES.STUDENT_NUMBER.REGEX,
  TIME_REGEX: VALIDATION_RULES.SESSION_TIME.REGEX
} as const
