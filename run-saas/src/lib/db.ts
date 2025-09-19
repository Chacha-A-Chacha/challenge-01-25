// lib/db.ts

import { PrismaClient, Prisma } from '@prisma/client'
import { 
  ENVIRONMENT, 
  REQUEST_TIMEOUTS, 
  OFFLINE_CONFIG,
  SESSION_RULES,
  ATTENDANCE_RULES,
  EXCEL_IMPORT,
  ERROR_MESSAGES 
} from './constants'

// ============================================================================
// PRISMA CLIENT CONFIGURATION
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection configuration based on environment
const getDatabaseConfig = () => {
  const isDev = process.env.NODE_ENV === ENVIRONMENT.DEV
  const isProduction = process.env.NODE_ENV === ENVIRONMENT.PROD

  return {
    // Logging configuration
    log: isDev 
      ? ['query', 'error', 'warn'] as Prisma.LogLevel[]
      : ['error'] as Prisma.LogLevel[],
    
    // Error formatting for better debugging
    errorFormat: isDev ? 'pretty' : 'minimal' as Prisma.ErrorFormat,
    
    // Connection pooling for serverless environments
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  }
}

// Create Prisma client with optimized configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient(getDatabaseConfig())

// Prevent multiple instances in development
if (process.env.NODE_ENV !== ENVIRONMENT.PROD) {
  globalForPrisma.prisma = prisma
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Test database connection health
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
}

/**
 * Get database connection status and metrics
 */
export async function getDatabaseHealth() {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime

    return {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute operations in a transaction with retry logic
 */
export async function withTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(operations, {
        timeout: REQUEST_TIMEOUTS.LONG_RUNNING,
        maxWait: REQUEST_TIMEOUTS.DEFAULT,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
      })
    } catch (error) {
      lastError = error as Error
      console.warn(`Transaction attempt ${attempt} failed:`, error)
      
      // Don't retry on certain errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (['P2002', 'P2025'].includes(error.code)) {
          throw error // Unique constraint or record not found - don't retry
        }
      }
      
      if (attempt === maxRetries) break
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  throw lastError!
}

// ============================================================================
// ATTENDANCE-SPECIFIC DATABASE UTILITIES
// ============================================================================

/**
 * Mark attendance for a student in a session
 */
export async function markAttendance(data: {
  studentId: string
  sessionId: string
  status: 'PRESENT' | 'ABSENT' | 'WRONG_SESSION'
  scanTime?: Date
  teacherId?: string
}) {
  return withTransaction(async (tx) => {
    const today = new Date().toDateString()
    const todayStart = new Date(today)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Check if attendance already exists for today
    const existingAttendance = await tx.attendance.findFirst({
      where: {
        studentId: data.studentId,
        sessionId: data.sessionId,
        date: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    })

    if (existingAttendance) {
      throw new Error(ERROR_MESSAGES.ATTENDANCE.ALREADY_MARKED)
    }

    // Create attendance record
    return tx.attendance.create({
      data: {
        studentId: data.studentId,
        sessionId: data.sessionId,
        date: new Date(),
        status: data.status,
        scanTime: data.scanTime || new Date(),
        teacherId: data.teacherId
      },
      include: {
        student: {
          select: {
            studentNumber: true,
            firstName: true,
            lastName: true
          }
        },
        session: {
          select: {
            day: true,
            startTime: true,
            endTime: true
          }
        }
      }
    })
  })
}

/**
 * Get attendance statistics for a session
 */
export async function getSessionAttendanceStats(sessionId: string, date?: Date) {
  const targetDate = date || new Date()
  const dayStart = new Date(targetDate.toDateString())
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  const [attendanceRecords, sessionInfo] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    }),
    prisma.session.findUnique({
      where: { id: sessionId },
      select: { capacity: true, _count: { select: { students: true } } }
    })
  ])

  const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length
  const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length
  const wrongSessionCount = attendanceRecords.filter(a => a.status === 'WRONG_SESSION').length
  const totalStudents = sessionInfo?._count.students || 0

  return {
    totalStudents,
    presentCount,
    absentCount,
    wrongSessionCount,
    attendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
    capacity: sessionInfo?.capacity || 0
  }
}

/**
 * Auto-mark absent students after session ends
 */
export async function autoMarkAbsentStudents(sessionId: string, date: Date) {
  return withTransaction(async (tx) => {
    // Get all students assigned to this session
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { students: true }
    })

    if (!session) return { marked: 0 }

    const dayStart = new Date(date.toDateString())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    // Get existing attendance records for the day
    const existingAttendance = await tx.attendance.findMany({
      where: {
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      select: { studentId: true }
    })

    const presentStudentIds = new Set(existingAttendance.map(a => a.studentId))
    
    // Find students without attendance records
    const absentStudents = session.students.filter(
      student => !presentStudentIds.has(student.id)
    )

    // Mark them as absent
    const absentRecords = await tx.attendance.createMany({
      data: absentStudents.map(student => ({
        studentId: student.id,
        sessionId,
        date,
        status: 'ABSENT' as const
      }))
    })

    return { marked: absentRecords.count }
  })
}

// ============================================================================
// SESSION MANAGEMENT UTILITIES
// ============================================================================

/**
 * Validate session time doesn't conflict with existing sessions
 */
export async function validateSessionTime(
  classId: string,
  day: 'SATURDAY' | 'SUNDAY',
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<boolean> {
  const conflictingSessions = await prisma.session.findMany({
    where: {
      classId,
      day,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } }
          ]
        }
      ]
    }
  })

  return conflictingSessions.length === 0
}

/**
 * Get available session capacity
 */
export async function getSessionCapacityInfo(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { students: true }
      }
    }
  })

  if (!session) return null

  return {
    capacity: session.capacity,
    enrolled: session._count.students,
    available: session.capacity - session._count.students
  }
}

// ============================================================================
// STUDENT MANAGEMENT UTILITIES
// ============================================================================

/**
 * Auto-assign students to sessions based on capacity
 */
export async function autoAssignStudentsToSessions(classId: string) {
  return withTransaction(async (tx) => {
    // Get unassigned students in the class
    const unassignedStudents = await tx.student.findMany({
      where: {
        classId,
        sessions: { none: {} }
      }
    })

    if (unassignedStudents.length === 0) {
      return { assigned: 0, message: 'No unassigned students found' }
    }

    // Get all sessions for the class
    const sessions = await tx.session.findMany({
      where: { classId },
      include: {
        _count: { select: { students: true } }
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' }
      ]
    })

    const saturdaySessions = sessions.filter(s => s.day === 'SATURDAY')
    const sundaySessions = sessions.filter(s => s.day === 'SUNDAY')

    if (saturdaySessions.length === 0 || sundaySessions.length === 0) {
      throw new Error('Class must have both Saturday and Sunday sessions')
    }

    let assignedCount = 0

    for (const student of unassignedStudents) {
      // Find Saturday session with available capacity
      const availableSaturdaySession = saturdaySessions
        .filter(session => session._count.students < session.capacity)
        .sort((a, b) => a._count.students - b._count.students)[0]

      // Find Sunday session with available capacity
      const availableSundaySession = sundaySessions
        .filter(session => session._count.students < session.capacity)
        .sort((a, b) => a._count.students - b._count.students)[0]

      if (!availableSaturdaySession || !availableSundaySession) {
        console.warn(`No available sessions for student ${student.studentNumber}`)
        continue
      }

      // Assign student to both sessions
      await tx.student.update({
        where: { id: student.id },
        data: {
          sessions: {
            connect: [
              { id: availableSaturdaySession.id },
              { id: availableSundaySession.id }
            ]
          }
        }
      })

      // Update local counts to maintain accurate capacity tracking
      availableSaturdaySession._count.students++
      availableSundaySession._count.students++
      assignedCount++
    }

    return { assigned: assignedCount }
  })
}

/**
 * Validate student reassignment request
 */
export async function validateReassignmentRequest(
  studentId: string,
  fromSessionId: string,
  toSessionId: string
) {
  const [student, fromSession, toSession] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: { 
        sessions: true,
        reassignmentRequests: {
          where: { status: 'PENDING' }
        }
      }
    }),
    prisma.session.findUnique({ 
      where: { id: fromSessionId },
      include: { _count: { select: { students: true } } }
    }),
    prisma.session.findUnique({ 
      where: { id: toSessionId },
      include: { _count: { select: { students: true } } }
    })
  ])

  if (!student || !fromSession || !toSession) {
    throw new Error('Student or session not found')
  }

  // Check if student has pending requests
  if (student.reassignmentRequests.length > 0) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.PENDING_REQUEST_EXISTS)
  }

  // Check if student has reached max requests
  const totalRequests = await prisma.reassignmentRequest.count({
    where: { studentId }
  })

  if (totalRequests >= ATTENDANCE_RULES.MAX_REASSIGNMENT_REQUESTS) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.MAX_REQUESTS_REACHED)
  }

  // Validate same day restriction
  if (fromSession.day !== toSession.day) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.SAME_DAY_ONLY)
  }

  // Validate same class restriction
  if (fromSession.classId !== toSession.classId) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.SAME_CLASS_ONLY)
  }

  // Check target session capacity
  if (toSession._count.students >= toSession.capacity) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.SESSION_FULL)
  }

  return true
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk import students with validation
 */
export async function bulkImportStudents(
  studentsData: Array<{
    studentNumber: string
    firstName: string
    lastName?: string
    email: string
    phoneNumber?: string
  }>,
  classId: string
) {
  return withTransaction(async (tx) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process in batches to avoid overwhelming the database
    const batchSize = EXCEL_IMPORT.BATCH_SIZE
    const batches = []
    
    for (let i = 0; i < studentsData.length; i += batchSize) {
      batches.push(studentsData.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      for (const studentData of batch) {
        try {
          // Check for duplicate student number in class
          const existingStudent = await tx.student.findFirst({
            where: {
              studentNumber: studentData.studentNumber,
              classId
            }
          })

          if (existingStudent) {
            results.failed++
            results.errors.push(`Student ${studentData.studentNumber} already exists in this class`)
            continue
          }

          // Create student
          await tx.student.create({
            data: {
              studentNumber: studentData.studentNumber,
              firstName: studentData.firstName,
              lastName: studentData.lastName,
              email: studentData.email,
              phoneNumber: studentData.phoneNumber,
              classId,
              uuid: crypto.randomUUID() // Generate UUID for QR codes
            }
          })

          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(
            `Failed to import ${studentData.studentNumber}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          )
        }
      }
    }

    return results
  })
}

// ============================================================================
// CLEANUP AND MAINTENANCE
// ============================================================================

/**
 * Clean up old attendance records (for GDPR compliance)
 */
export async function cleanupOldAttendanceRecords(daysToKeep: number = 365) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const deleted = await prisma.attendance.deleteMany({
    where: {
      date: {
        lt: cutoffDate
      }
    }
  })

  return { deletedCount: deleted.count }
}

/**
 * Get database statistics for monitoring
 */
export async function getDatabaseStats() {
  const [
    adminCount,
    courseCount,
    teacherCount,
    classCount,
    sessionCount,
    studentCount,
    attendanceCount,
    reassignmentCount
  ] = await Promise.all([
    prisma.admin.count(),
    prisma.course.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.session.count(),
    prisma.student.count(),
    prisma.attendance.count(),
    prisma.reassignmentRequest.count()
  ])

  return {
    admins: adminCount,
    courses: courseCount,
    teachers: teacherCount,
    classes: classCount,
    sessions: sessionCount,
    students: studentCount,
    attendanceRecords: attendanceCount,
    reassignmentRequests: reassignmentCount,
    timestamp: new Date().toISOString()
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return 'A record with this information already exists'
      case 'P2025':
        return 'The requested record was not found'
      case 'P2003':
        return 'Invalid reference to related record'
      case 'P2014':
        return 'Invalid ID provided'
      default:
        return `Database error: ${error.message}`
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return 'Invalid data provided'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected database error occurred'
}

// ============================================================================
// EXPORTS
// ============================================================================

export default prisma

// Re-export Prisma types for convenience
export type { Prisma } from '@prisma/client'
export type {
  Admin,
  Course,
  Teacher,
  Class,
  Session,
  Student,
  Attendance,
  ReassignmentRequest
} from '@prisma/client'
