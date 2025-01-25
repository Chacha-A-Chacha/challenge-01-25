// app/api/teacher/registrations/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateForm, rejectRegistrationSchema } from '@/lib/validations'
import { ERROR_MESSAGES } from '@/lib/constants'
import type { RejectRegistrationRequest, ApiResponse } from '@/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * POST /api/teacher/registrations/:id/reject
 * Reject a registration with reason
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== 'teacher') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const teacherId = session.user.id
        const body = await request.json() as RejectRegistrationRequest

        // Validate input
        const { isValid, errors, data } = validateForm(rejectRegistrationSchema, body)

        if (!isValid || !data) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: errors },
                { status: 400 }
            )
        }

        // Get registration
        const registration = await prisma.studentRegistration.findUnique({
            where: { id }
        })

        if (!registration) {
            return NextResponse.json(
                { success: false, error: ERROR_MESSAGES.REGISTRATION.NOT_FOUND },
                { status: 404 }
            )
        }

        if (registration.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: ERROR_MESSAGES.REGISTRATION.ALREADY_PROCESSED },
                { status: 400 }
            )
        }

        // Verify teacher has access
        if (registration.courseId !== session.user.courseId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        // Update registration
        await prisma.studentRegistration.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: data.reason,
                reviewedById: teacherId,
                reviewedAt: new Date()
            }
        })

        const response: ApiResponse<{ id: string }> = {
            success: true,
            data: { id },
            message: 'Registration rejected'
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Rejection failed:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to reject registration' },
            { status: 500 }
        )
    }
}
