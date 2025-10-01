// lib/db.ts
import {PrismaClient, Prisma} from '@prisma/client'
import {PrismaClientKnownRequestError, PrismaClientValidationError} from '@prisma/client/runtime/library'
import type {
    Admin,
    TeacherWithCourse,
    StudentWithSessions,
    CourseWithDetails,
    ClassWithSessions,
    Session,
    Attendance,
    Student,
    StudentImportData,
    AutoAssignmentResult,
    AttendanceStats,
    QRCodeData,
    WeekDay,
    AttendanceStatus,
    CourseStatus,
    TeacherRole
} from '@/types'
import { SESSION_RULES } from './constants'
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

            default:
                return `Database error: ${error.message}`
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

export async function findAdminByEmail(email: string): Promise<Admin | null> {
    try {
        return await prisma.admin.findUnique({
            where: {email: email.toLowerCase().trim()}
        })
    } catch (error) {
        console.error('Error finding admin by email:', error)
        return null
    }
}

export async function findTeacherByEmail(email: string): Promise<TeacherWithCourse | null> {
    try {
        return await prisma.teacher.findUnique({
            where: {email: email.toLowerCase().trim()},
            include: {
                course: true,
                headCourse: true
            }
        })
    } catch (error) {
        console.error('Error finding teacher by email:', error)
        return null
    }
}

export async function findStudentByCredentials(
    studentNumber: string,
    phoneNumber?: string,
    email?: string
): Promise<StudentWithSessions | null> {
    try {
        const baseWhere: Prisma.StudentWhereInput = {
            studentNumber: studentNumber.toUpperCase().trim()
        }

        if (phoneNumber) baseWhere.phoneNumber = phoneNumber.trim()
        if (email) baseWhere.email = email.toLowerCase().trim()

        return await prisma.student.findFirst({
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
    } catch (error) {
        console.error('Error finding student by credentials:', error)
        return null
    }
}

export async function findStudentByUUID(uuid: string): Promise<StudentWithSessions | null> {
    try {
        return await prisma.student.findUnique({
            where: {uuid},
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
    } catch (error) {
        console.error('Error finding student by UUID:', error)
        return null
    }
}

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

export async function createCourseWithHeadTeacher(
    courseName: string,
    headTeacherEmail: string,
    hashedPassword: string
): Promise<{ course: CourseWithDetails; teacher: TeacherWithCourse }> {
    return withTransaction(async (tx) => {
        // Check if email already exists
        const existingTeacher = await tx.teacher.findUnique({
            where: {email: headTeacherEmail.toLowerCase().trim()}
        })

        if (existingTeacher) {
            throw new Error('Email address is already in use')
        }

        // Create head teacher first
        const headTeacher = await tx.teacher.create({
            data: {
                email: headTeacherEmail.toLowerCase().trim(),
                password: hashedPassword,
                role: 'HEAD' as TeacherRole
            }
        })

        // Create course with head teacher
        const courseResult = await tx.course.create({
            data: {
                name: courseName.trim(),
                headTeacherId: headTeacher.id,
                status: 'ACTIVE' as CourseStatus
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
            where: {id: headTeacher.id},
            data: {courseId: courseResult.id},
            include: {
                course: true,
                headCourse: true
            }
        })

        return {
            course: courseResult as CourseWithDetails,
            teacher: teacherResult as TeacherWithCourse
        }
    })
}

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
                orderBy: {createdAt: 'desc'}
            }
        } else if (userRole === 'teacher') {
            courseQuery = {
                where: {
                    OR: [
                        {headTeacherId: userId},
                        {teachers: {some: {id: userId}}}
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
        return results as CourseWithDetails[]
    } catch (error) {
        console.error('Error getting accessible courses:', error)
        return []
    }
}

// ============================================================================
// CLASS AND SESSION MANAGEMENT
// ============================================================================

export async function createClass(
    courseId: string,
    name: string,
    capacity: number
): Promise<ClassWithSessions> {
    try {
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

        return result as ClassWithSessions
    } catch (error) {
        throw new Error(handlePrismaError(error))
    }
}

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
            return {isValid: false, conflictMessage: 'Start time must be before end time'}
        }

        const duration = endMinutes - startMinutes
        if (duration < SESSION_RULES.MIN_DURATION_MINUTES) {
            return {
                isValid: false,
                conflictMessage: `Session must be at least ${SESSION_RULES.MIN_DURATION_MINUTES} minutes long`
            }
        }

        // Check for conflicts with existing sessions
        const conflictingSessions = await prisma.session.findMany({
            where: {
                classId,
                day,
                id: excludeSessionId ? {not: excludeSessionId} : undefined,
                OR: [
                    {
                        AND: [
                            {startTime: {lte: startTime}},
                            {endTime: {gt: startTime}}
                        ]
                    },
                    {
                        AND: [
                            {startTime: {lt: endTime}},
                            {endTime: {gte: endTime}}
                        ]
                    }
                ]
            }
        })

        if (conflictingSessions.length > 0) {
            const conflictTimes = conflictingSessions.map((s: Session) =>
                `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`
            ).join(', ')

            return {
                isValid: false,
                conflictMessage: `Session conflicts with existing sessions: ${conflictTimes}`
            }
        }

        return {isValid: true}
    } catch (error) {
        console.error('Error validating session time:', error)
        return {isValid: false, conflictMessage: 'Error validating session time'}
    }
}

export async function createSession(
    classId: string,
    day: WeekDay,
    startTime: string,
    endTime: string,
    capacity: number
): Promise<Session> {
    try {
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

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

export async function autoAssignStudentsToSessions(classId: string): Promise<AutoAssignmentResult> {
    return withTransaction(async (tx) => {
        const unassignedStudents = await tx.student.findMany({
            where: {
                classId,
                sessions: {none: {}}
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

        const sessions = await tx.session.findMany({
            where: {classId},
            include: {
                _count: {select: {students: true}}
            },
            orderBy: [
                {day: 'asc'},
                {startTime: 'asc'}
            ]
        })

        const saturdaySessions = sessions.filter((s: Session & {
            _count: { students: number }
        }) => s.day === 'SATURDAY')
        const sundaySessions = sessions.filter((s: Session & { _count: { students: number } }) => s.day === 'SUNDAY')

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
        sessions.forEach((session: Session & { _count: { students: number } }) => {
            sessionEnrollment.set(session.id, session._count.students)
        })

        // Assign students to sessions with load balancing
        for (const student of unassignedStudents) {
            const availableSaturday = saturdaySessions
                .filter((s: Session & { _count: { students: number } }) => {
                    const currentEnrollment = sessionEnrollment.get(s.id) ?? 0
                    return currentEnrollment < s.capacity
                })
                .sort((a: Session & { _count: { students: number } }, b: Session & {
                    _count: { students: number }
                }): number => {
                    const enrollmentA = sessionEnrollment.get(a.id) ?? 0
                    const enrollmentB = sessionEnrollment.get(b.id) ?? 0
                    return enrollmentA - enrollmentB
                })[0]

            const availableSunday = sundaySessions
                .filter((s: Session & { _count: { students: number } }) => {
                    const currentEnrollment = sessionEnrollment.get(s.id) ?? 0
                    return currentEnrollment < s.capacity
                })
                .sort((a: Session & { _count: { students: number } }, b: Session & {
                    _count: { students: number }
                }): number => {
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
                await tx.student.update({
                    where: {id: student.id},
                    data: {
                        sessions: {
                            connect: [
                                {id: availableSaturday.id},
                                {id: availableSunday.id}
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

        const classExists = await tx.class.findUnique({
            where: {id: classId}
        })

        if (!classExists) {
            throw new Error('Class not found')
        }

        // Process in batches
        const batchSize = 100
        const batches = []

        for (let i = 0; i < studentsData.length; i += batchSize) {
            batches.push(studentsData.slice(i, i + batchSize))
        }

        for (const batch of batches) {
            const batchPromises = batch.map(async (studentData, index) => {
                try {
                    // Check for duplicates
                    const existingStudent = await tx.student.findFirst({
                        where: {
                            studentNumber: studentData.student_number.toUpperCase().trim(),
                            classId
                        }
                    })

                    if (existingStudent) {
                        results.failed++
                        results.errors.push(`Row ${index + 1}: Student ${studentData.student_number} already exists`)
                        return null
                    }

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
                    results.errors.push(`Row ${index + 1}: ${errorMessage}`)
                    return null
                }
            })

            await Promise.all(batchPromises)
        }

        return results
    })
}

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

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
        const student = await tx.student.findUnique({
            where: {uuid: qrData.uuid},
            include: {
                sessions: true,
                class: {include: {sessions: true}}
            }
        })

        if (!student) {
            throw new Error('Student not found')
        }

        if (student.studentNumber !== qrData.student_id) {
            throw new Error('QR code data mismatch')
        }

        const session = await tx.session.findUnique({
            where: {id: sessionId}
        })

        if (!session) {
            throw new Error('Session not found')
        }

        // Check if today is correct day and within time window
        const today = new Date()
        const dayOfWeek = today.getDay()
        const sessionDay = session.day === 'SATURDAY' ? 6 : 0

        if (dayOfWeek !== sessionDay) {
            throw new Error('QR code can only be scanned on the correct session day')
        }

        const currentTime = today.getHours() * 60 + today.getMinutes()
        const sessionStart = parseTimeToMinutes(session.startTime) - SESSION_RULES.EARLY_ENTRY_MINUTES
        const sessionEnd = parseTimeToMinutes(session.endTime) + SESSION_RULES.LATE_ENTRY_MINUTES

        if (currentTime < sessionStart || currentTime > sessionEnd) {
            throw new Error('QR code can only be scanned during session time window')
        }

        // Check for existing attendance today
        const {start: dayStart, end: dayEnd} = getStartEndOfDay(today)
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

        const isAssignedToSession = student.sessions.some((s: Session) => s.id === sessionId)
        const isCorrectClass = student.class?.sessions?.some((s: Session) => s.id === sessionId) ?? false

        if (isAssignedToSession) {
            status = 'PRESENT' as AttendanceStatus
            message = 'Attendance marked successfully'
        } else if (isCorrectClass) {
            status = 'WRONG_SESSION' as AttendanceStatus
            message = 'Student scanned in wrong session but marked present'
        } else {
            throw new Error('Student is not enrolled in this class')
        }

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
                where: {id: existingAttendance.id},
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

        return {attendance, status, message}
    })
}

export async function getSessionAttendanceStats(
    sessionId: string,
    date?: Date
): Promise<AttendanceStats> {
    try {
        const targetDate = date || new Date()
        const {start: dayStart, end: dayEnd} = getStartEndOfDay(targetDate)

        const [session, attendanceRecords] = await Promise.all([
            prisma.session.findUnique({
                where: {id: sessionId},
                include: {
                    _count: {select: {students: true}}
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
        const presentCount = attendanceRecords.filter((a: Attendance) => a.status === 'PRESENT').length
        const absentCount = attendanceRecords.filter((a: Attendance) => a.status === 'ABSENT').length
        const wrongSessionCount = attendanceRecords.filter((a: Attendance) => a.status === 'WRONG_SESSION').length

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

export async function healthCheck(): Promise<{
    database: boolean
    timestamp: string
}> {
    try {
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

export default prisma
export type {Prisma} from '@prisma/client'
