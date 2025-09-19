// lib/db.ts
import { PrismaClient, Prisma } from '@prisma/client'
import type {
  Admin,
  Course,
  Teacher,
  Class,
  Session,
  Student,
  Attendance,
  ReassignmentRequest,
  AttendanceStatus,
  WeekDay,
  StudentImportData,
  EntityId,
  ApiResponse,
  AutoAssignmentResult
} from '@/types'
import { ERROR_MESSAGES, ATTENDANCE_RULES, EXCEL_IMPORT } from './constants'

// ============================================================================
// PRISMA CLIENT SETUP
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn)
}

// ============================================================================
// AUTHENTICATION QUERIES
// ============================================================================

/**
 * Find admin by email
 */
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  return prisma.admin.findUnique({
    where: { email: email.toLowerCase() }
  })
}

/**
 * Find teacher by email with course relations
 */
export async function findTeacherByEmail(email: string) {
  return prisma.teacher.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      course: true,
      headCourse: true
    }
  })
}

/**
 * Find student by credentials
 */
export async function findStudentByCredentials(
  studentNumber: string,
  phoneNumber?: string,
  email?: string
): Promise<Student | null> {
  const whereClause: Prisma.StudentWhereInput = {
    studentNumber: studentNumber.toUpperCase()
  }

  if (phoneNumber) {
    whereClause.phoneNumber = phoneNumber
  }

  if (email) {
    whereClause.email = email.toLowerCase()
  }

  return prisma.student.findFirst({
    where: whereClause,
    include: {
      class: {
        include: {
          course: true
        }
      },
      sessions: true
    }
  })
}

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

/**
 * Create course with head teacher
 */
export async function createCourseWithHeadTeacher(
  courseName: string,
  headTeacherEmail: string,
  hashedPassword: string
): Promise<{ course: Course; teacher: Teacher }> {
  return withTransaction(async (tx) => {
    // Create head teacher first
    const headTeacher = await tx.teacher.create({
      data: {
        email: headTeacherEmail.toLowerCase(),
        password: hashedPassword,
        role: 'HEAD'
      }
    })

    // Create course with head teacher
    const course = await tx.course.create({
      data: {
        name: courseName,
        headTeacherId: headTeacher.id,
        status: 'ACTIVE'
      },
      include: {
        headTeacher: true,
        teachers: true,
        classes: true
      }
    })

    // Update teacher with course relationship
    await tx.teacher.update({
      where: { id: headTeacher.id },
      data: { courseId: course.id }
    })

    return { course, teacher: headTeacher }
  })
}

/**
 * Get accessible courses for user
 */
export async function getAccessibleCourses(userId: string, userRole: string): Promise<Course[]> {
  if (userRole === 'admin') {
    return prisma.course.findMany({
      include: {
        headTeacher: true,
        teachers: true,
        classes: true,
        _count: {
          select: {
            teachers: true,
            classes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  if (userRole === 'teacher') {
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { headTeacherId: userId },
          { teachers: { some: { id: userId } } }
        ]
      },
      include: {
        headTeacher: true,
        teachers: true,
        classes: true
      }
    })
    return courses
  }

  return []
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Validate session time doesn't conflict
 */
export async function validateSessionTime(
  classId: string,
  day: WeekDay,
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
 * Get session capacity info
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
// STUDENT MANAGEMENT
// ============================================================================

/**
 * Auto-assign students to sessions
 */
export async function autoAssignStudentsToSessions(classId: string): Promise<AutoAssignmentResult> {
  return withTransaction(async (tx) => {
    // Get unassigned students
    const unassignedStudents = await tx.student.findMany({
      where: {
        classId,
        sessions: { none: {} }
      }
    })

    if (unassignedStudents.length === 0) {
      return {
        assigned: 0,
        failed: 0,
        errors: [],
        assignments: [],
        unassigned: []
      }
    }

    // Get available sessions grouped by day
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

    const assignments: Array<{
      studentId: string
      saturdaySessionId: string
      sundaySessionId: string
    }> = []

    const unassigned: Student[] = []
    const errors: string[] = []

    // Assign students to sessions
    for (const student of unassignedStudents) {
      // Find available Saturday session
      const availableSaturday = saturdaySessions.find(
        s => s._count.students < s.capacity
      )

      // Find available Sunday session
      const availableSunday = sundaySessions.find(
        s => s._count.students < s.capacity
      )

      if (!availableSaturday || !availableSunday) {
        unassigned.push(student)
        errors.push(`No available sessions for student ${student.studentNumber}`)
        continue
      }

      try {
        // Connect student to both sessions
        await tx.student.update({
          where: { id: student.id },
          data: {
            sessions: {
              connect: [
                { id: availableSaturday.id },
                { id: availableSunday.id }
              ]
            }
          }
        })

        assignments.push({
          studentId: student.id,
          saturdaySessionId: availableSaturday.id,
          sundaySessionId: availableSunday.id
        })

        // Update counts for next iteration
        availableSaturday._count.students++
        availableSunday._count.students++

      } catch (error) {
        unassigned.push(student)
        errors.push(`Failed to assign student ${student.studentNumber}: ${error}`)
      }
    }

    return {
      assigned: assignments.length,
      failed: unassigned.length,
      errors,
      assignments,
      unassigned
    }
  })
}

/**
 * Bulk import students
 */
export async function bulkImportStudents(
  studentsData: StudentImportData[],
  classId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  return withTransaction(async (tx) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process in batches
    const batchSize = EXCEL_IMPORT.BATCH_SIZE
    const batches = []
    
    for (let i = 0; i < studentsData.length; i += batchSize) {
      batches.push(studentsData.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      for (const studentData of batch) {
        try {
          // Check for duplicate
          const existingStudent = await tx.student.findFirst({
            where: {
              studentNumber: studentData.student_number.toUpperCase(),
              classId
            }
          })

          if (existingStudent) {
            results.failed++
            results.errors.push(`Student ${studentData.student_number} already exists`)
            continue
          }

          // Create student
          await tx.student.create({
            data: {
              studentNumber: studentData.student_number.toUpperCase(),
              firstName: studentData.first_name,
              lastName: studentData.last_name,
              email: studentData.email.toLowerCase(),
              phoneNumber: studentData.phone_number,
              classId,
              uuid: crypto.randomUUID()
            }
          })

          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(
            `Failed to import ${studentData.student_number}: ${
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
// ATTENDANCE MANAGEMENT
// ============================================================================

/**
 * Mark attendance for student
 */
export async function markAttendance(
  studentId: string,
  sessionId: string,
  status: AttendanceStatus,
  teacherId?: string,
  scanTime?: Date
): Promise<Attendance> {
  const date = new Date()
  const dayStart = new Date(date.toDateString())
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  return withTransaction(async (tx) => {
    // Check for existing attendance
    const existing = await tx.attendance.findFirst({
      where: {
        studentId,
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    })

    if (existing) {
      // Update existing attendance
      return tx.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          scanTime,
          teacherId
        },
        include: {
          student: true,
          session: true,
          markedBy: true
        }
      })
    } else {
      // Create new attendance record
      return tx.attendance.create({
        data: {
          studentId,
          sessionId,
          date: dayStart,
          status,
          scanTime,
          teacherId
        },
        include: {
          student: true,
          session: true,
          markedBy: true
        }
      })
    }
  })
}

/**
 * Auto-mark absent students
 */
export async function autoMarkAbsentStudents(sessionId: string, date: Date): Promise<{ marked: number }> {
  return withTransaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { students: true }
    })

    if (!session) return { marked: 0 }

    const dayStart = new Date(date.toDateString())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    // Get existing attendance
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
    
    // Find absent students
    const absentStudents = session.students.filter(
      student => !presentStudentIds.has(student.id)
    )

    // Mark as absent
    const absentRecords = await tx.attendance.createMany({
      data: absentStudents.map(student => ({
        studentId: student.id,
        sessionId,
        date: dayStart,
        status: 'ABSENT' as const
      }))
    })

    return { marked: absentRecords.count }
  })
}

// ============================================================================
// REASSIGNMENT MANAGEMENT
// ============================================================================

/**
 * Validate reassignment request
 */
export async function validateReassignmentRequest(
  studentId: string,
  fromSessionId: string,
  toSessionId: string
): Promise<void> {
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

  // Check pending requests
  if (student.reassignmentRequests.length > 0) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.PENDING_REQUEST_EXISTS)
  }

  // Check max requests
  const totalRequests = await prisma.reassignmentRequest.count({
    where: { studentId }
  })

  if (totalRequests >= ATTENDANCE_RULES.MAX_REASSIGNMENT_REQUESTS) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.MAX_REQUESTS_REACHED)
  }

  // Validate same day
  if (fromSession.day !== toSession.day) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.SAME_DAY_ONLY)
  }

  // Validate same class
  if (fromSession.classId !== toSession.classId) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.SAME_CLASS_ONLY)
  }

  // Check capacity
  if (toSession._count.students >= toSession.capacity) {
    throw new Error(ERROR_MESSAGES.REASSIGNMENT.SESSION_FULL)
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle Prisma errors
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
// CLEANUP UTILITIES
// ============================================================================

/**
 * Get database statistics
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

export default prisma

// Re-export Prisma types
export type { Prisma } from '@prisma/client'