// app/api/register/courses/[courseId]/classes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { ApiResponse } from '@/types'

interface RouteParams {
    params: Promise<{ courseId: string }>
}

interface ClassPublic {
    id: string
    name: string
    capacity: number
    saturdaySessions: number
    sundaySessions: number
    availableSpots: number
    hasSaturdayAvailability: boolean
    hasSundayAvailability: boolean
}

interface ClassesResponse {
    courseId: string
    courseName: string
    classes: ClassPublic[]
}

/**
 * GET /api/register/courses/:courseId/classes
 * Public endpoint - returns classes with availability for a course
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

        // Get all classes for this course with sessions and availability
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
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Transform classes with availability data
        const classesWithAvailability: ClassPublic[] = classes.map(cls => {
            // Separate sessions by day
            const saturdaySessions = cls.sessions.filter(s => s.day === 'SATURDAY')
            const sundaySessions = cls.sessions.filter(s => s.day === 'SUNDAY')

            // Calculate availability for each session
            const saturdayAvailability = saturdaySessions.map(session => {
                const approvedCount = session.saturdayStudents.length
                const pendingCount = session.pendingSaturdayRegs.length
                const taken = approvedCount + pendingCount
                return Math.max(0, session.capacity - taken)
            })

            const sundayAvailability = sundaySessions.map(session => {
                const approvedCount = session.sundayStudents.length
                const pendingCount = session.pendingSundayRegs.length
                const taken = approvedCount + pendingCount
                return Math.max(0, session.capacity - taken)
            })

            // Get minimum available spots (bottleneck session determines class availability)
            const minSaturdaySpots = saturdayAvailability.length > 0 
                ? Math.min(...saturdayAvailability) 
                : 0
            const minSundaySpots = sundayAvailability.length > 0 
                ? Math.min(...sundayAvailability) 
                : 0

            // Overall class availability is the minimum of Saturday and Sunday
            const availableSpots = Math.min(minSaturdaySpots, minSundaySpots)

            return {
                id: cls.id,
                name: cls.name,
                capacity: cls.capacity,
                saturdaySessions: saturdaySessions.length,
                sundaySessions: sundaySessions.length,
                availableSpots,
                hasSaturdayAvailability: minSaturdaySpots > 0,
                hasSundayAvailability: minSundaySpots > 0
            }
        })

        // Filter out classes with no sessions
        const validClasses = classesWithAvailability.filter(
            cls => cls.saturdaySessions > 0 && cls.sundaySessions > 0
        )

        const response: ApiResponse<ClassesResponse> = {
            success: true,
            data: {
                courseId: course.id,
                courseName: course.name,
                classes: validClasses
            }
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Failed to fetch classes:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch classes' },
            { status: 500 }
        )
    }
}
