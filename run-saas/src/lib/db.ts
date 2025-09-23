// lib/db.ts
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library'
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
  CourseStatus,
  RequestStatus,
  TeacherRole,
  QRCodeData,
  AutoAssignmentResult,
  AttendanceStats,
  StudentImportData,
  StudentAttendanceHistory,
  AttendanceRecord,
  SessionWithAttendance,
  StudentWithSessions,
  CourseWithDetails,
  TeacherWithCourse,
  ClassWithSessions
} from '@/types'
import { 
  ERROR_MESSAGES, 
  ATTENDANCE_RULES, 
  EXCEL_IMPORT,
  SESSION_RULES,
  WEEK_DAYS,
  ATTENDANCE_STATUS,
  REQUEST_STATUS,
  COURSE_STATUS,
  TEACHER_ROLES
} from './constants'
import { formatTime, parseTimeToMinutes, getStartEndOfDay } from './utils'

// ============================================================================
// PRISMA CLIENT SETUP
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty'
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isTeacherWithCourse(data: unknown): data is TeacherWithCourse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data &&
    'role' in data
  )
}

function isStudentWithSessions(data: unknown): data is StudentWithSessions {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'uuid' in data &&
    'studentNumber' in data &&
    'sessions' in data &&
    Array.isArray((data as Record<string, unknown>).sessions)
  )
}

function isCourseWithDetails(data: unknown): data is CourseWithDetails {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'headTeacher' in data
  )
}

function isClassWithSessions(data: unknown): data is ClassWithSessions {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'sessions' in data &&
    Array.isArray((data as Record<string, unknown>).sessions)
  )
}

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number
    timeout?: number
    isolationLevel?: Prisma.TransactionIsolationLevel
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait || 5000,
    timeout: options?.timeout || 10000,
    isolationLevel: options?.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted
  })
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export function handlePrismaError(error: unknown): string {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        const target = error.meta?.target as string[] | undefined
        if (target?.includes('email')) {
          return 'Email address is already in use'
        }
        if (target?.includes('studentNumber')) {
          return 'Student number already exists in this class'
        }
        return 'A record with this information already exists'
      
      case 'P2025':
        return 'The requested record was not found'
      
      case 'P2003':
        return 'Invalid reference to related record'
      
      case 'P2014':
        return 'Invalid ID provided'
      
      case 'P2016':
        return 'Query interpretation error'
      
      case 'P2021':
        return 'Table does not exist in the current database'
      
      default:
        return `Database error (${error.code}): ${error.message}`
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return 'Invalid data provided to database operation'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected database error occurred'
}

// ============================================================================
// AUTHENTICATION QUERIES
// ============================================================================

/**
 * Find admin by email (case-insensitive)
 */
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  try {
    return await prisma.admin.findUnique({
      where: { 
        email: email.toLowerCase().trim() 
      }
    })
  } catch (error) {
    console.error('Error finding admin by email:', error)
    return null
  }
}

/**
 * Find teacher by email with course relations
 */
export async function findTeacherByEmail(email: string): Promise<TeacherWithCourse | null> {
  try {
    const result = await prisma.teacher.findUnique({
      where: { 
        email: email.toLowerCase().trim() 
      },
      include: {
        course: true,
        headCourse: true
      }
    })

    if (!result) return null

    // Type guard validation
    if (isTeacherWithCourse(result)) {
      return result
    }

    console.warn('Teacher query result does not match expected type')
    return null
  } catch (error) {
    console.error('Error finding teacher by email:', error)
    return null
  }
}

/**
 * Find student by multiple authentication methods
 */
export async function findStudentByCredentials(
  studentNumber: string,
  phoneNumber?: string,
  email?: string
): Promise<StudentWithSessions | null> {
  try {
    const baseWhere: Prisma.StudentWhereInput = {
      studentNumber: studentNumber.toUpperCase().trim()
    }

    // Add additional criteria if provided
    if (phoneNumber) {
      baseWhere.phoneNumber = phoneNumber.trim()
    }
    
    if (email) {
      baseWhere.email = email.toLowerCase().trim()
    }

    const result = await prisma.student.findFirst({
      where: baseWhere,
      include: {
        class: {
          include: {
            course: true,
            sessions: true
          }
        },
        sessions: true
      }
    })

    if (!result) return null

    // Type guard validation
    if (isStudentWithSessions(result)) {
      return result
    }

    console.warn('Student query result does not match expected type')
    return null
  } catch (error) {
    console.error('Error finding student by credentials:', error)
    return null
  }
}

/**
 * Find student by UUID (for QR code validation)
 */
export async function findStudentByUUID(uuid: string): Promise<StudentWithSessions | null> {
  try {
    const result = await prisma.student.findUnique({
      where: { uuid },
      include: {
        class: {
          include: {
            course: true,
            sessions: true
          }
        },
        sessions: true
      }
    })

    if (!result) return null

    // Type guard validation
    if (isStudentWithSessions(result)) {
      return result
    }

    console.warn('Student UUID query result does not match expected type')
    return null
  } catch (error) {
    console.error('Error finding student by UUID:', error)
    return null
  }
}

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

/**
 * Create course with head teacher (atomic operation)
 */
export async function createCourseWithHeadTeacher(
  courseName: string,
  headTeacherEmail: string,
  hashedPassword: string
): Promise<{ course: CourseWithDetails; teacher: TeacherWithCourse }> {
  return withTransaction(async (tx) => {
    // Check if email already exists
    const existingTeacher = await tx.teacher.findUnique({
      where: { email: headTeacherEmail.toLowerCase().trim() }
    })
    
    if (existingTeacher) {
      throw new Error('Email address is already in use')
    }

    // Create head teacher first
    const headTeacher = await tx.teacher.create({
      data: {
        email: headTeacherEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: TEACHER_ROLES.HEAD as TeacherRole
      }
    })

    // Create course with head teacher
    const courseResult = await tx.course.create({
      data: {
        name: courseName.trim(),
        headTeacherId: headTeacher.id,
        status: COURSE_STATUS.ACTIVE as CourseStatus
      },
      include: {
        headTeacher: true,
        teachers: true,
        classes: {
          include: {
            sessions: true,
            students: true
          }
        },
        _count: {
          select: {
            teachers: true,
            classes: true
          }
        }
      }
    })

    // Update teacher with course relationship
    const teacherResult = await tx.teacher.update({
      where: { id: headTeacher.id },
      data: { courseId: courseResult.id },
      include: {
        course: true,
        headCourse: true
      }
    })

    // Validate results with type guards
    if (!isCourseWithDetails(courseResult)) {
      throw new Error('Invalid course creation result')
    }

    if (!isTeacherWithCourse(teacherResult)) {
      throw new Error('Invalid teacher creation result')
    }

    return { 
      course: courseResult, 
      teacher: teacherResult 
    }
  })
}

/**
 * Get accessible courses for user based on role
 */
export async function getAccessibleCourses(
  userId: string, 
  userRole: string
): Promise<CourseWithDetails[]> {
  try {
    let courseQuery: Prisma.CourseFindManyArgs

    if (userRole === 'admin') {
      courseQuery = {
        include: {
          headTeacher: true,
          teachers: true,
          classes: {
            include: {
              sessions: true,
              students: true
            }
          },
          _count: {
            select: {
              teachers: true,
              classes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    } else if (userRole === 'teacher') {
      courseQuery = {
        where: {
          OR: [
            { headTeacherId: userId },
            { teachers: { some: { id: userId } } }
          ]
        },
        include: {
          headTeacher: true,
          teachers: true,
          classes: {
            include: {
              sessions: true,
              students: true
            }
          },
          _count: {
            select: {
              teachers: true,
              classes: true
            }
          }
        }
      }
    } else {
      return []
    }

    const results = await prisma.course.findMany(courseQuery)
    
    // Filter results through type guard
    return results.filter(isCourseWithDetails)
  } catch (error) {
    console.error('Error getting accessible courses:', error)
    return []
  }
}

/**
 * Update course status or information
 */
export async function updateCourse(
  courseId: string,
  updates: Partial<Pick<Course, 'name' | 'endDate' | 'status'>>
): Promise<CourseWithDetails> {
  try {
    const result = await prisma.course.update({
      where: { id: courseId },
      data: updates,
      include: {
        headTeacher: true,
        teachers: true,
        classes: {
          include: {
            sessions: true,
            students: true
          }
        },
        _count: {
          select: {
            teachers: true,
            classes: true
          }
        }
      }
    })

    if (!isCourseWithDetails(result)) {
      throw new Error('Invalid course update result')
    }

    return result
  } catch (error) {
    throw new Error(handlePrismaError(error))
  }
}

/**
 * Remove head teacher and deactivate course
 */
export async function removeHeadTeacherAndDeactivateCourse(courseId: string): Promise<void> {
  return withTransaction(async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      include: { headTeacher: true }
    })

    if (!course) {
      throw new Error('Course not found')
    }

    // Remove head teacher
    await tx.teacher.delete({
      where: { id: course.headTeacherId }
    })

    // Deactivate course
    await tx.course.update({
      where: { id: courseId },
      data: { 
        status: COURSE_STATUS.INACTIVE as CourseStatus,
        endDate: new Date()
      }
    })
  })
}

// ============================================================================
// CLASS AND SESSION MANAGEMENT
// ============================================================================

/**
 * Create class with validation
 */
export async function createClass(
  courseId: string,
  name: string,
  capacity: number
): Promise<ClassWithSessions> {
  try {
    // Check for duplicate class name in course
    const existingClass = await prisma.class.findFirst({
      where: {
        courseId,
        name: name.trim()
      }
    })

    if (existingClass) {
      throw new Error('Class name already exists in this course')
    }

    const result = await prisma.class.create({
      data: {
        name: name.trim(),
        capacity,
        courseId
      },
      include: {
        sessions: true,
        students: true,
        course: true,
        _count: {
          select: {
            sessions: true,
            students: true
          }
        }
      }
    })

    if (!isClassWithSessions(result)) {
      throw new Error('Invalid class creation result')
    }

    return result
  } catch (error) {
    throw new Error(handlePrismaError(error))
  }
}

/**
 * Validate session time doesn't conflict
 */
export async function validateSessionTime(
  classId: string,
  day: WeekDay,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<{ isValid: boolean; conflictMessage?: string }> {
  try {
    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)

    // Validate time window
    if (startMinutes >= endMinutes) {
      return { isValid: false, conflictMessage: 'Start time must be before end time' }
    }

    const duration = endMinutes - startMinutes
    if (duration < SESSION_RULES.MIN_DURATION_MINUTES) {
      return { 
        isValid: false, 
        conflictMessage: `Session must be at least ${SESSION_RULES.MIN_DURATION_MINUTES} minutes long` 
      }
    }

    if (duration > SESSION_RULES.MAX_DURATION_MINUTES) {
      return { 
        isValid: false, 
        conflictMessage: `Session cannot exceed ${SESSION_RULES.MAX_DURATION_MINUTES} minutes` 
      }
    }

    // Check for conflicts with existing sessions
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

    if (conflictingSessions.length > 0) {
      const conflictTimes = conflictingSessions.map(s => 
        `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`
      ).join(', ')
      
      return { 
        isValid: false, 
        conflictMessage: `Session conflicts with existing sessions: ${conflictTimes}` 
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('Error validating session time:', error)
    return { isValid: false, conflictMessage: 'Error validating session time' }
  }
}

/**
 * Create session with conflict validation
 */
export async function createSession(
  classId: string,
  day: WeekDay,
  startTime: string,
  endTime: string,
  capacity: number
): Promise<Session> {
  try {
    // Validate session time
    const validation = await validateSessionTime(classId, day, startTime, endTime)
    if (!validation.isValid) {
      throw new Error(validation.conflictMessage)
    }

    return await prisma.session.create({
      data: {
        classId,
        day,
        startTime,
        endTime,
        capacity
      }
    })
  } catch (error) {
    throw new Error(handlePrismaError(error))
  }
}

/**
 * Get session capacity information
 */
export async function getSessionCapacityInfo(sessionId: string): Promise<{
  capacity: number
  enrolled: number
  available: number
} | null> {
  try {
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
  } catch (error) {
    console.error('Error getting session capacity info:', error)
    return null
  }
}

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * Auto-assign students to sessions with balanced distribution
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

    const saturdaySessions = sessions.filter(s => s.day === WEEK_DAYS.SATURDAY)
    const sundaySessions = sessions.filter(s => s.day === WEEK_DAYS.SUNDAY)

    if (saturdaySessions.length === 0 || sundaySessions.length === 0) {
      return {
        assigned: 0,
        failed: unassignedStudents.length,
        errors: ['Both Saturday and Sunday sessions are required for assignment'],
        assignments: [],
        unassigned: unassignedStudents
      }
    }

    const assignments: Array<{
      studentId: string
      saturdaySessionId: string
      sundaySessionId: string
    }> = []

    const unassigned: Student[] = []
    const errors: string[] = []

    // Track current enrollment for balanced assignment
    const sessionEnrollment = new Map<string, number>()
    sessions.forEach(session => {
      sessionEnrollment.set(session.id, session._count.students)
    })

    // Assign students to sessions with load balancing
    for (const student of unassignedStudents) {
      // Find Saturday session with lowest enrollment that has capacity
      const availableSaturday = saturdaySessions
        .filter(s => {
          const currentEnrollment = sessionEnrollment.get(s.id)
          return typeof currentEnrollment === 'number' && currentEnrollment < s.capacity
        })
        .sort((a, b) => {
          const enrollmentA = sessionEnrollment.get(a.id) ?? 0
          const enrollmentB = sessionEnrollment.get(b.id) ?? 0
          return enrollmentA - enrollmentB
        })[0]

      // Find Sunday session with lowest enrollment that has capacity
      const availableSunday = sundaySessions
        .filter(s => {
          const currentEnrollment = sessionEnrollment.get(s.id)
          return typeof currentEnrollment === 'number' && currentEnrollment < s.capacity
        })
        .sort((a, b) => {
          const enrollmentA = sessionEnrollment.get(a.id) ?? 0
          const enrollmentB = sessionEnrollment.get(b.id) ?? 0
          return enrollmentA - enrollmentB
        })[0]

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

        // Update enrollment tracking
        const satEnrollment = sessionEnrollment.get(availableSaturday.id) ?? 0
        const sunEnrollment = sessionEnrollment.get(availableSunday.id) ?? 0
        sessionEnrollment.set(availableSaturday.id, satEnrollment + 1)
        sessionEnrollment.set(availableSunday.id, sunEnrollment + 1)

      } catch (error: unknown) {
        unassigned.push(student)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to assign student ${student.studentNumber}: ${errorMessage}`)
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
 * Bulk import students from Excel data
 */
export async function bulkImportStudents(
  studentsData: StudentImportData[],
  classId: string
): Promise<{ 
  success: number
  failed: number
  errors: string[]
  students: Student[]
}> {
  return withTransaction(async (tx) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      students: [] as Student[]
    }

    // Validate class exists
    const classExists = await tx.class.findUnique({
      where: { id: classId }
    })

    if (!classExists) {
      throw new Error('Class not found')
    }

    // Process in batches to avoid overwhelming the database
    const batchSize = EXCEL_IMPORT.BATCH_SIZE
    const batches = []
    
    for (let i = 0; i < studentsData.length; i += batchSize) {
      batches.push(studentsData.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (studentData, index) => {
        try {
          // Check for duplicate within the same class
          const existingStudent = await tx.student.findFirst({
            where: {
              studentNumber: studentData.student_number.toUpperCase().trim(),
              classId
            }
          })

          if (existingStudent) {
            results.failed++
            results.errors.push(`Row ${index + 1}: Student ${studentData.student_number} already exists in this class`)
            return null
          }

          // Check for email conflicts across all students
          if (studentData.email) {
            const emailConflict = await tx.student.findFirst({
              where: {
                email: studentData.email.toLowerCase().trim()
              }
            })

            if (emailConflict) {
              results.failed++
              results.errors.push(`Row ${index + 1}: Email ${studentData.email} is already in use`)
              return null
            }
          }

          // Create student with generated UUID
          const student = await tx.student.create({
            data: {
              studentNumber: studentData.student_number.toUpperCase().trim(),
              firstName: studentData.first_name.trim(),
              lastName: studentData.last_name?.trim() || null,
              email: studentData.email.toLowerCase().trim(),
              phoneNumber: studentData.phone_number?.trim() || null,
              classId,
              uuid: crypto.randomUUID()
            }
          })

          results.success++
          results.students.push(student)
          return student

        } catch (error: unknown) {
          results.failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Row ${index + 1}: Failed to import ${studentData.student_number}: ${errorMessage}`)
          return null
        }
      })

      // Wait for batch to complete
      await Promise.all(batchPromises)
    }

    return results
  })
}

/**
 * Reassign student to different sessions
 */
export async function reassignStudentToSessions(
  studentId: string,
  saturdaySessionId: string,
  sundaySessionId: string
): Promise<void> {
  return withTransaction(async (tx) => {
    // Validate student exists
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: { sessions: true }
    })

    if (!student) {
      throw new Error('Student not found')
    }

    // Validate sessions exist and are in the same class
    const [saturdaySession, sundaySession] = await Promise.all([
      tx.session.findUnique({ where: { id: saturdaySessionId } }),
      tx.session.findUnique({ where: { id: sundaySessionId } })
    ])

    if (!saturdaySession || !sundaySession) {
      throw new Error('One or more sessions not found')
    }

    if (saturdaySession.classId !== student.classId || sundaySession.classId !== student.classId) {
      throw new Error('Sessions must be in the same class as the student')
    }

    if (saturdaySession.day !== WEEK_DAYS.SATURDAY || sundaySession.day !== WEEK_DAYS.SUNDAY) {
      throw new Error('Invalid session day assignments')
    }

    // Check capacity
    const [satCapacity, sunCapacity] = await Promise.all([
      getSessionCapacityInfo(saturdaySessionId),
      getSessionCapacityInfo(sundaySessionId)
    ])

    if (!satCapacity || !sunCapacity) {
      throw new Error('Unable to check session capacity')
    }

    if (satCapacity.available <= 0 || sunCapacity.available <= 0) {
      throw new Error('One or more sessions are at full capacity')
    }

    // Disconnect from current sessions and connect to new ones
    await tx.student.update({
      where: { id: studentId },
      data: {
        sessions: {
          set: [
            { id: saturdaySessionId },
            { id: sundaySessionId }
          ]
        }
      }
    })
  })
}

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

/**
 * Mark attendance for student with QR validation
 */
export async function markAttendanceFromQR(
  qrData: QRCodeData,
  sessionId: string,
  teacherId: string
): Promise<{
  attendance: Attendance
  status: AttendanceStatus
  message: string
}> {
  return withTransaction(async (tx) => {
    // Find student by UUID
    const student = await tx.student.findUnique({
      where: { uuid: qrData.uuid },
      include: { 
        sessions: true,
        class: { include: { sessions: true } }
      }
    })

    if (!student) {
      throw new Error('Student not found')
    }

    // Validate student number matches
    if (student.studentNumber !== qrData.studentId) {
      throw new Error('QR code data mismatch')
    }

    // Get session information
    const session = await tx.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Check if today is the correct day for this session
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday
    const sessionDay = session.day === WEEK_DAYS.SATURDAY ? 6 : 0
    
    if (dayOfWeek !== sessionDay) {
      throw new Error('QR code can only be scanned on the correct session day')
    }

    // Check if current time is within session window
    const currentTime = today.getHours() * 60 + today.getMinutes()
    const sessionStart = parseTimeToMinutes(session.startTime) - SESSION_RULES.EARLY_ENTRY_MINUTES
    const sessionEnd = parseTimeToMinutes(session.endTime) + SESSION_RULES.LATE_ENTRY_MINUTES
    
    if (currentTime < sessionStart || currentTime > sessionEnd) {
      throw new Error('QR code can only be scanned during session time window')
    }

    // Check for existing attendance today
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(today)
    const existingAttendance = await tx.attendance.findFirst({
      where: {
        studentId: student.id,
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    })

    // Determine attendance status
    let status: AttendanceStatus
    let message: string

    const isAssignedToSession = student.sessions.some(s => s.id === sessionId)
    const isCorrectClass = student.class?.sessions?.some(s => s.id === sessionId) ?? false
    
    if (isAssignedToSession) {
      status = ATTENDANCE_STATUS.PRESENT as AttendanceStatus
      message = 'Attendance marked successfully'
    } else if (isCorrectClass) {
      status = ATTENDANCE_STATUS.WRONG_SESSION as AttendanceStatus
      message = 'Student scanned in wrong session but marked present'
    } else {
      throw new Error('Student is not enrolled in this class')
    }

    // Create or update attendance record
    const attendanceData = {
      studentId: student.id,
      sessionId,
      date: dayStart,
      status,
      scanTime: new Date(),
      teacherId
    }

    let attendance: Attendance

    if (existingAttendance) {
      attendance = await tx.attendance.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true
        }
      })
      message = `Updated attendance: ${message}`
    } else {
      attendance = await tx.attendance.create({
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true
        }
      })
    }

    return { attendance, status, message }
  })
}

/**
 * Mark manual attendance
 */
export async function markManualAttendance(
  studentId: string,
  sessionId: string,
  status: AttendanceStatus,
  teacherId: string,
  date?: Date
): Promise<Attendance> {
  return withTransaction(async (tx) => {
    const targetDate = date || new Date()
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(targetDate)

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

    const attendanceData = {
      studentId,
      sessionId,
      date: dayStart,
      status,
      teacherId,
      scanTime: null // Manual marking doesn't have scan time
    }

    if (existing) {
      return await tx.attendance.update({
        where: { id: existing.id },
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true
        }
      })
    } else {
      return await tx.attendance.create({
        data: attendanceData,
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
 * Auto-mark absent students after session
 */
export async function autoMarkAbsentStudents(
  sessionId: string, 
  date: Date
): Promise<{ marked: number }> {
  return withTransaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { students: true }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    const { start: dayStart, end: dayEnd } = getStartEndOfDay(date)

    // Get existing attendance for this session and date
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

    if (absentStudents.length === 0) {
      return { marked: 0 }
    }

    // Create absence records
    const absentRecords = await tx.attendance.createMany({
      data: absentStudents.map(student => ({
        studentId: student.id,
        sessionId,
        date: dayStart,
        status: ATTENDANCE_STATUS.ABSENT as AttendanceStatus
      }))
    })

    return { marked: absentRecords.count }
  })
}

/**
 * Get attendance statistics for a session
 */
export async function getSessionAttendanceStats(
  sessionId: string,
  date?: Date
): Promise<AttendanceStats> {
  try {
    const targetDate = date || new Date()
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(targetDate)

    const [session, attendanceRecords] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          _count: { select: { students: true } }
        }
      }),
      prisma.attendance.findMany({
        where: {
          sessionId,
          date: {
            gte: dayStart,
            lt: dayEnd
          }
        }
      })
    ])

    if (!session) {
      throw new Error('Session not found')
    }

    const totalStudents = session._count.students
    const presentCount = attendanceRecords.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length
    const absentCount = attendanceRecords.filter(a => a.status === ATTENDANCE_STATUS.ABSENT).length
    const wrongSessionCount = attendanceRecords.filter(a => a.status === ATTENDANCE_STATUS.WRONG_SESSION).length

    return {
      totalStudents,
      presentCount,
      absentCount,
      wrongSessionCount,
      attendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
      capacity: session.capacity,
      utilizationRate: session.capacity > 0 ? Math.round((totalStudents / session.capacity) * 100) : 0
    }
  } catch (error) {
    console.error('Error getting session attendance stats:', error)
    throw new Error(handlePrismaError(error))
  }
}

/**
 * Get student attendance history
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  limit = 50
): Promise<StudentAttendanceHistory> {
  try {
    const [student, attendanceRecords] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          sessions: true
        }
      }),
      prisma.attendance.findMany({
        where: { studentId },
        include: {
          session: true
        },
        orderBy: { date: 'desc' },
        take: limit
      })
    ])

    if (!student) {
      throw new Error('Student not found')
    }

    const totalSessions = attendanceRecords.length
    const presentSessions = attendanceRecords.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length
    const absentSessions = attendanceRecords.filter(a => a.status === ATTENDANCE_STATUS.ABSENT).length
    const wrongSessionCount = attendanceRecords.filter(a => a.status === ATTENDANCE_STATUS.WRONG_SESSION).length

    // Calculate attendance streak
    let currentStreak = 0
    let longestStreak = 0
    let streakType: 'present' | 'absent' = 'present'
    let tempStreak = 0
    let tempType: 'present' | 'absent' = 'present'

    for (const record of attendanceRecords) {
      const isPresent = record.status === ATTENDANCE_STATUS.PRESENT
      
      if (currentStreak === 0) {
        currentStreak = 1
        streakType = isPresent ? 'present' : 'absent'
        tempStreak = 1
        tempType = streakType
      } else if ((streakType === 'present' && isPresent) || (streakType === 'absent' && !isPresent)) {
        currentStreak++
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        currentStreak = 1
        streakType = isPresent ? 'present' : 'absent'
        tempStreak = 1
        tempType = streakType
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak)

    return {
      student,
      attendanceRecords,
      attendanceRate: totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0,
      totalSessions,
      presentSessions,
      absentSessions,
      wrongSessionCount,
      streak: {
        current: currentStreak,
        longest: longestStreak,
        type: tempType
      }
    }
  } catch (error) {
    console.error('Error getting student attendance history:', error)
    throw new Error(handlePrismaError(error))
  }
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
): Promise<{ isValid: boolean; message?: string }> {
  try {
    const [student, fromSession, toSession] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: { 
          sessions: true,
          reassignmentRequests: {
            where: { status: REQUEST_STATUS.PENDING }
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
      return { isValid: false, message: 'Student or session not found' }
    }

    // Check if student has pending requests
    if (student.reassignmentRequests.length > 0) {
      return { isValid: false, message: ERROR_MESSAGES.REASSIGNMENT.PENDING_REQUEST_EXISTS }
    }

    // Check total requests limit
    const totalRequests = await prisma.reassignmentRequest.count({
      where: { studentId }
    })

    if (totalRequests >= ATTENDANCE_RULES.MAX_REASSIGNMENT_REQUESTS) {
      return { isValid: false, message: ERROR_MESSAGES.REASSIGNMENT.MAX_REQUESTS_REACHED }
    }

    // Validate same day
    if (fromSession.day !== toSession.day) {
      return { isValid: false, message: ERROR_MESSAGES.REASSIGNMENT.SAME_DAY_ONLY }
    }

    // Validate same class
    if (fromSession.classId !== toSession.classId) {
      return { isValid: false, message: ERROR_MESSAGES.REASSIGNMENT.SAME_CLASS_ONLY }
    }

    // Check if student is actually assigned to the from session
    const isAssignedToFromSession = student.sessions.some(s => s.id === fromSessionId)
    if (!isAssignedToFromSession) {
      return { isValid: false, message: 'Student is not assigned to the source session' }
    }

    // Check capacity of target session
    if (toSession._count.students >= toSession.capacity) {
      return { isValid: false, message: ERROR_MESSAGES.REASSIGNMENT.SESSION_FULL }
    }

    return { isValid: true }
  } catch (error) {
    console.error('Error validating reassignment request:', error)
    return { isValid: false, message: 'Error validating reassignment request' }
  }
}

/**
 * Create reassignment request
 */
export async function createReassignmentRequest(
  studentId: string,
  fromSessionId: string,
  toSessionId: string,
  reason?: string
): Promise<ReassignmentRequest> {
  return withTransaction(async (tx) => {
    // Validate the request
    const validation = await validateReassignmentRequest(studentId, fromSessionId, toSessionId)
    if (!validation.isValid) {
      throw new Error(validation.message)
    }

    return await tx.reassignmentRequest.create({
      data: {
        studentId,
        fromSessionId,
        toSessionId,
        status: REQUEST_STATUS.PENDING as RequestStatus
      },
      include: {
        student: true,
        fromSession: true,
        toSession: true
      }
    })
  })
}

/**
 * Process reassignment request (approve/deny)
 */
export async function processReassignmentRequest(
  requestId: string,
  status: typeof REQUEST_STATUS.APPROVED | typeof REQUEST_STATUS.DENIED,
  teacherId: string
): Promise<ReassignmentRequest> {
  return withTransaction(async (tx) => {
    const request = await tx.reassignmentRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        fromSession: true,
        toSession: true
      }
    })

    if (!request) {
      throw new Error('Reassignment request not found')
    }

    if (request.status !== REQUEST_STATUS.PENDING) {
      throw new Error('Request has already been processed')
    }

    // Update request status
    const updatedRequest = await tx.reassignmentRequest.update({
      where: { id: requestId },
      data: {
        status: status as RequestStatus,
        teacherId
      },
      include: {
        student: true,
        fromSession: true,
        toSession: true,
        approvedBy: true
      }
    })

    // If approved, update student's session assignment
    if (status === REQUEST_STATUS.APPROVED) {
      // Get student's current sessions
      const studentSessions = await tx.student.findUnique({
        where: { id: request.studentId },
        include: { sessions: true }
      })

      if (studentSessions) {
        // Replace the from session with the to session
        const updatedSessionIds = studentSessions.sessions
          .filter(s => s.id !== request.fromSessionId)
          .map(s => ({ id: s.id }))
        
        updatedSessionIds.push({ id: request.toSessionId })

        await tx.student.update({
          where: { id: request.studentId },
          data: {
            sessions: {
              set: updatedSessionIds
            }
          }
        })
      }
    }

    return updatedRequest
  })
}

// ============================================================================
// REPORTING AND ANALYTICS
// ============================================================================

/**
 * Get comprehensive database statistics
 */
export async function getDatabaseStats(): Promise<{
  admins: number
  courses: number
  teachers: number
  classes: number
  sessions: number
  students: number
  attendanceRecords: number
  reassignmentRequests: number
  lastUpdated: string
}> {
  try {
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
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error getting database stats:', error)
    throw new Error(handlePrismaError(error))
  }
}

/**
 * Health check for database connectivity
 */
export async function healthCheck(): Promise<{ 
  database: boolean
  timestamp: string
  version?: string 
}> {
  try {
    // Simple query to test connectivity
    await prisma.$queryRaw`SELECT 1 as test`
    
    return {
      database: true,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    return {
      database: false,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Cleanup old attendance records (optional maintenance function)
 */
export async function cleanupOldRecords(olderThanDays = 365): Promise<{ deleted: number }> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await prisma.attendance.deleteMany({
      where: {
        date: {
          lt: cutoffDate
        }
      }
    })

    return { deleted: result.count }
  } catch (error) {
    console.error('Error cleaning up old records:', error)
    throw new Error(handlePrismaError(error))
  }
}

// Export the Prisma client for direct use when needed
export default prisma

// Re-export Prisma types for convenience
export type { Prisma } from '@prisma/client'