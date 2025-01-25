// app/api/register/courses/[courseId]/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { CourseSessionsResponse, SessionWithAvailability, ApiResponse } from '@/types'

interface RouteParams {
    params: Promise<{ courseId: string }>
}

/**
 * GET /api/register/courses/:courseId/sessions
 * Public endpoint - returns sessions with availability for a course
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { courseId } = await params

        // Verify course exists and is active
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name: true, status: true }
        })

        if (!course) {
            return NextResponse.json(
                { success: false, error: 'Course not found' },
                { status: 404 }
            )
        }

        if (course.status !== 'ACTIVE') {
            return NextResponse.json(
                { success: false, error: 'Course is not accepting registrations' },
                { status: 400 }
            )
        }

        // Get all sessions for this course with counts
        const classes = await prisma.class.findMany({
            where: { courseId },
            include: {
                sessions: {
                    include: {
                        // Count approved students
                        saturdayStudents: { select: { id: true } },
                        sundayStudents: { select: { id: true } },
                        // Count pending registrations
                        pendingSaturdayRegs: {
                            where: { status: 'PENDING' },
                            select: { id: true }
                        },
                        pendingSundayRegs: {
                            where: { status: 'PENDING' },
                            select: { id: true }
                        }
                    }
                }
            }
        })

        // Transform sessions with availability
        const allSessions: SessionWithAvailability[] = []

        for (const cls of classes) {
            for (const session of cls.sessions) {
                // Calculate taken spots based on day
                const approvedCount = session.day === 'SATURDAY'
                    ? session.saturdayStudents.length
                    : session.sundayStudents.length

                const pendingCount = session.day === 'SATURDAY'
                    ? session.pendingSaturdayRegs.length
                    : session.pendingSundayRegs.length

                const taken = approvedCount + pendingCount
                const available = Math.max(0, session.capacity - taken)

                allSessions.push({
                    id: session.id,
                    classId: session.classId,
                    className: cls.name,
                    day: session.day,
                    startTime: formatTime(session.startTime),
                    endTime: formatTime(session.endTime),
                    capacity: session.capacity,
                    available,
                    isFull: available <= 0
                })
            }
        }

        // Group by day and sort by time
        const saturday = allSessions
            .filter(s => s.day === 'SATURDAY')
            .sort((a, b) => a.startTime.localeCompare(b.startTime))

        const sunday = allSessions
            .filter(s => s.day === 'SUNDAY')
            .sort((a, b) => a.startTime.localeCompare(b.startTime))

        const response: ApiResponse<CourseSessionsResponse> = {
            success: true,
            data: {
                courseId: course.id,
                courseName: course.name,
                saturday,
                sunday
            }
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Failed to fetch sessions:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch sessions' },
            { status: 500 }
        )
    }
}

/**
 * Format Date to time string (HH:MM)
 */
function formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5)
}
