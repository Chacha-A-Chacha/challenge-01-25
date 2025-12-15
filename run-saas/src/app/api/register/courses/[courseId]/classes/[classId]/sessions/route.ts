// app/api/register/courses/[courseId]/classes/[classId]/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { CourseSessionsResponse, SessionWithAvailability, ApiResponse } from '@/types'

interface RouteParams {
    params: Promise<{ courseId: string; classId: string }>
}

/**
 * GET /api/register/courses/:courseId/classes/:classId/sessions
 * Public endpoint - returns sessions with availability for a specific class
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { courseId, classId } = await params

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

        // Verify class exists and belongs to this course
        const classData = await prisma.class.findUnique({
            where: { 
                id: classId,
                courseId: courseId  // Ensure class belongs to this course
            },
            select: { id: true, name: true, courseId: true }
        })

        if (!classData) {
            return NextResponse.json(
                { success: false, error: 'Class not found or does not belong to this course' },
                { status: 404 }
            )
        }

        // Get sessions ONLY for this specific class
        const sessions = await prisma.session.findMany({
            where: { classId },
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
            },
            orderBy: {
                startTime: 'asc'
            }
        })

        // Transform sessions with availability
        const allSessions: SessionWithAvailability[] = sessions.map(session => {
            // Calculate taken spots based on day
            const approvedCount = session.day === 'SATURDAY'
                ? session.saturdayStudents.length
                : session.sundayStudents.length

            const pendingCount = session.day === 'SATURDAY'
                ? session.pendingSaturdayRegs.length
                : session.pendingSundayRegs.length

            const taken = approvedCount + pendingCount
            const available = Math.max(0, session.capacity - taken)

            return {
                id: session.id,
                classId: session.classId,
                className: classData.name,
                day: session.day,
                startTime: formatTime(session.startTime),
                endTime: formatTime(session.endTime),
                capacity: session.capacity,
                available,
                isFull: available <= 0
            }
        })

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
