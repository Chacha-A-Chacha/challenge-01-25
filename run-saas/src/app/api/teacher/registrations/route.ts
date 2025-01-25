// app/api/teacher/registrations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { RegistrationDetail, ApiResponse, PaginatedResponse } from '@/types'

/**
 * GET /api/teacher/registrations
 * Protected endpoint - returns pending registrations for teacher's course
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== 'teacher') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const courseId = session.user.courseId

        if (!courseId) {
            return NextResponse.json(
                { success: false, error: 'No course assigned' },
                { status: 400 }
            )
        }

        // Parse query params
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'PENDING'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const search = searchParams.get('search') || ''

        const skip = (page - 1) * limit

        // Build where clause
        const where = {
            courseId,
            status: status === 'all' ? undefined : status as 'PENDING' | 'APPROVED' | 'REJECTED',
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { surname: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } }
                ]
            })
        }

        // Get registrations with count
        const [registrations, total] = await Promise.all([
            prisma.studentRegistration.findMany({
                where,
                include: {
                    course: { select: { name: true } },
                    saturdaySession: {
                        select: {
                            id: true,
                            startTime: true,
                            endTime: true,
                            class: { select: { name: true } }
                        }
                    },
                    sundaySession: {
                        select: {
                            id: true,
                            startTime: true,
                            endTime: true,
                            class: { select: { name: true } }
                        }
                    },
                    reviewedBy: { select: { email: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.studentRegistration.count({ where })
        ])

        // Transform to response format
        const data: RegistrationDetail[] = registrations.map(reg => ({
            id: reg.id,
            surname: reg.surname,
            firstName: reg.firstName,
            lastName: reg.lastName ?? undefined,
            email: reg.email,
            phoneNumber: reg.phoneNumber ?? undefined,
            courseName: reg.course.name,
            saturdaySession: {
                id: reg.saturdaySession.id,
                time: formatSessionTime(reg.saturdaySession.startTime, reg.saturdaySession.endTime),
                className: reg.saturdaySession.class.name
            },
            sundaySession: {
                id: reg.sundaySession.id,
                time: formatSessionTime(reg.sundaySession.startTime, reg.sundaySession.endTime),
                className: reg.sundaySession.class.name
            },
            paymentReceiptUrl: reg.paymentReceiptUrl,
            paymentReceiptNo: reg.paymentReceiptNo,
            status: reg.status,
            createdAt: reg.createdAt.toISOString(),
            reviewedAt: reg.reviewedAt?.toISOString(),
            reviewedBy: reg.reviewedBy?.email,
            rejectionReason: reg.rejectionReason ?? undefined
        }))

        const response: ApiResponse<PaginatedResponse<RegistrationDetail>> = {
            success: true,
            data: {
                data,
                total,
                page,
                limit,
                hasMore: skip + registrations.length < total
            }
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Failed to fetch registrations:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch registrations' },
            { status: 500 }
        )
    }
}

function formatSessionTime(start: Date, end: Date): string {
    const formatTime = (date: Date) => {
        const hours = date.getHours()
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHour = hours % 12 || 12
        return `${displayHour}:${minutes} ${ampm}`
    }
    return `${formatTime(start)} - ${formatTime(end)}`
}
