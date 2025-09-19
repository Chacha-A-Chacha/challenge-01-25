// lib/utils.ts
import type { 
  ValidationError, 
  ApiResponse, 
  SuccessResponse, 
  ErrorResponse,
  StudentImportData,
  QRCodeData
} from '@/types'
import { VALIDATION_RULES, REQUEST_TIMEOUTS, ERROR_MESSAGES } from './constants'

// ============================================================================
// STYLING UTILITIES
// ============================================================================

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: Array<string | undefined | null | boolean>): string {
  return inputs.filter(Boolean).join(' ')
}

/**
 * Generate status colors for attendance, requests, etc.
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'PRESENT': 'text-green-600 bg-green-50',
    'ABSENT': 'text-red-600 bg-red-50',
    'WRONG_SESSION': 'text-yellow-600 bg-yellow-50',
    'PENDING': 'text-blue-600 bg-blue-50',
    'APPROVED': 'text-green-600 bg-green-50',
    'DENIED': 'text-red-600 bg-red-50',
    'ACTIVE': 'text-green-600 bg-green-50',
    'INACTIVE': 'text-gray-600 bg-gray-50',
    'COMPLETED': 'text-blue-600 bg-blue-50'
  }
  
  return statusColors[status] ?? 'text-gray-600 bg-gray-50'
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Get start and end of day for date filtering
 */
export function getStartEndOfDay(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

/**
 * Format time for display
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  
  return `${displayHour}:${minutes} ${ampm}`
}

/**
 * Parse time to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if current time is within session window
 */
export function isWithinSessionTime(
  currentTime: Date,
  sessionDay: string,
  startTime: string,
  endTime: string,
  earlyEntryMinutes = 15
): boolean {
  const now = new Date(currentTime)
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
  
  // Check if it's the correct day
  const isCorrectDay = 
    (sessionDay === 'SATURDAY' && dayOfWeek === 6) ||
    (sessionDay === 'SUNDAY' && dayOfWeek === 0)
  
  if (!isCorrectDay) return false
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = parseTimeToMinutes(startTime) - earlyEntryMinutes
  const endMinutes = parseTimeToMinutes(endTime)
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
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
  
  const domain = email.split('@')[1]?.toLowerCase()
  if (
    domain &&
    VALIDATION_RULES.EMAIL.DOMAIN_BLOCKLIST.includes(
      domain as typeof VALIDATION_RULES.EMAIL.DOMAIN_BLOCKLIST[number]
    )
  ) {
    return { field: 'email', message: 'This email domain is not allowed' }
  }
  
  return null
}

/**
 * Validate phone number format
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
 */
export function validateName(name: string, fieldName = 'name'): ValidationError | null {
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
 * Validate QR code data
 */
export function validateQRData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString) as QRCodeData
    
    if (!data.uuid || !data.student_id) {
      return null
    }
    
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(data.uuid)) {
      return null
    }
    
    return data
  } catch {
    return null
  }
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

/**
 * Generate secure random password
 */
export function generateRandomPassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  const allChars = lowercase + uppercase + numbers + symbols
  let password = ''
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('')
}

// ============================================================================
// API UTILITIES
// ============================================================================

/**
 * Create standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> {
  if (success) {
    return {
      success: true,
      data,
      message
    } as SuccessResponse<T>
  } else {
    return {
      success: false,
      error: error || 'Unknown error occurred'
    } as ErrorResponse
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): ErrorResponse {
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    return createApiResponse(false, undefined, undefined, error.message) as ErrorResponse
  }
  
  return createApiResponse(false, undefined, undefined, 'An unexpected error occurred') as ErrorResponse
}

/**
 * Fetch with timeout and error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUTS.DEFAULT
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
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network request failed')
  }
}

/**
 * Parse API response safely
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json()
    
    if (!response.ok) {
      return createApiResponse(false, undefined, undefined, data.error || `HTTP ${response.status}`) as ErrorResponse
    }
    
    return data
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse response'
    return createApiResponse(false, undefined, undefined, errorMessage) as ErrorResponse
  }
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Validate Excel import file
 */
export function validateImportFile(file: File): ValidationError | null {
  if (file.size > 5 * 1024 * 1024) { // 5MB
    return { field: 'file', message: ERROR_MESSAGES.FILE_UPLOAD.FILE_TOO_LARGE }
  }
  
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  const allowedExtensions = ['.xlsx', '.xls', '.csv']
  
  if (!allowedExtensions.includes(extension)) {
    return { field: 'file', message: ERROR_MESSAGES.FILE_UPLOAD.INVALID_FORMAT }
  }
  
  return null
}

/**
 * Parse Excel file to student data
 */
export async function parseExcelFile(file: File): Promise<StudentImportData[]> {
  const XLSX = await import('xlsx')
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const result = e.target?.result
        if (!result) {
          reject(new Error('Failed to read file'))
          return
        }
        
        const data = new Uint8Array(result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        
        if (!worksheet) {
          reject(new Error('No worksheet found'))
          return
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]
        
        const studentData: StudentImportData[] = jsonData.map((row: Record<string, unknown>) => {
          const getStringValue = (key: string, alternatives: string[] = []): string => {
            const allKeys = [key, ...alternatives]
            for (const k of allKeys) {
              const value = row[k]
              if (value !== null && value !== undefined) {
                return String(value).trim()
              }
            }
            return ''
          }
          
          return {
            student_number: getStringValue('student_number', ['Student Number', 'StudentNumber', 'ID']),
            first_name: getStringValue('first_name', ['First Name', 'FirstName', 'Given Name']),
            last_name: getStringValue('last_name', ['Last Name', 'LastName', 'Surname']) || undefined,
            email: getStringValue('email', ['Email', 'Email Address']),
            phone_number: getStringValue('phone_number', ['Phone Number', 'PhoneNumber', 'Phone']) || undefined
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
 * Download data as CSV
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row: Record<string, unknown>) => 
      headers.map((header: string) => {
        const value = row[header] ?? ''
        const stringValue = String(value)
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue
      }).join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Safe localStorage wrapper
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue
    
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error: unknown) {
      console.warn('Failed to get from localStorage:', error)
      return defaultValue
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error: unknown) {
      console.warn('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(key)
    } catch (error: unknown) {
      console.warn('Failed to remove from localStorage:', error)
    }
  }
}

// ============================================================================
// FORMAT UTILITIES
// ============================================================================

/**
 * Format student name
 */
export function formatStudentName(firstName: string, lastName?: string): string {
  return lastName ? `${firstName} ${lastName}` : firstName
}

/**
 * Format session time range
 */
export function formatSessionTime(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

/**
 * Format capacity display
 */
export function formatCapacity(current: number, max: number): string {
  return `${current}/${max}`
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
