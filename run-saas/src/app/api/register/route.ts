// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/utils'
import { validateForm, studentRegistrationSchema } from '@/lib/validations'
import { ERROR_MESSAGES } from '@/lib/constants'
import type { StudentRegistrationRequest, StudentRegistrationResponse, ApiResponse } from '@/types'

/**
 * POST /api/register
 * Public endpoint - submit student registration
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as StudentRegistrationRequest & { confirmPassword: string }

        // Validate input
        const { isValid, errors, data } = validateForm(studentRegistrationSchema, body)

        if (!isValid || !data) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: errors },
                { status: 400 }
            )
        }

        // Check if email already exists (in students or registrations)
        const existingStudent = await prisma.student.findUnique({
            where: { email: data.email.toLowerCase() }
        })

        if (existingStudent) {
            return NextResponse.json(
                { success: false, error: ERROR_MESSAGES.REGISTRATION.EMAIL_EXISTS },
                { status: 409 }
            )
        }

        const existingRegistration = await prisma.studentRegistration.findUnique({
            where: { email: data.email.toLowerCase() }
        })

        if (existingRegistration) {
            if (existingRegistration.status === 'PENDING') {
                return NextResponse.json(
                    { success: false, error: 'You already have a pending registration' },
                    { status: 409 }
                )
            }
            // If rejected/expired, allow re-registration by deleting old one
            if (existingRegistration.status === 'REJECTED' || existingRegistration.status === 'EXPIRED') {
                await prisma.studentRegistration.delete({
                    where: { id: existingRegistration.id }
                })
            }
        }

        // Verify course is active
        const course = await prisma.course.findUnique({
            where: { id: data.courseId },
            select: { id: true, name: true, status: true }
        })

        if (!course || course.status !== 'ACTIVE') {
            return NextResponse.json(
                { success: false, error: ERROR_MESSAGES.REGISTRATION.COURSE_NOT_ACTIVE },
                { status: 400 }
            )
        }

        // Verify sessions exist and have capacity
        const [saturdaySession, sundaySession] = await Promise.all([
            getSessionWithAvailability(data.saturdaySessionId, 'SATURDAY'),
            getSessionWithAvailability(data.sundaySessionId, 'SUNDAY')
        ])

        if (!saturdaySession || saturdaySession.isFull) {
            return NextResponse.json(
                { success: false, error: 'Saturday session is full or invalid' },
                { status: 400 }
            )
        }

        if (!sundaySession || sundaySession.isFull) {
            return NextResponse.json(
                { success: false, error: 'Sunday session is full or invalid' },
                { status: 400 }
            )
        }

        // Hash password
        const passwordHash = await hashPassword(data.password)

        // Create registration
        const registration = await prisma.studentRegistration.create({
            data: {
                surname: data.surname.trim(),
                firstName: data.firstName.trim(),
                lastName: data.lastName?.trim() || null,
                email: data.email.toLowerCase().trim(),
                phoneNumber: data.phoneNumber?.trim() || null,
                courseId: data.courseId,
                saturdaySessionId: data.saturdaySessionId,
                sundaySessionId: data.sundaySessionId,
                passwordHash,
                paymentReceiptUrl: data.paymentReceiptUrl,
                paymentReceiptNo: data.paymentReceiptNo.trim()
            },
            include: {
                course: { select: { name: true } },
                saturdaySession: { select: { startTime: true, endTime: true } },
                sundaySession: { select: { startTime: true, endTime: true } }
            }
        })

        const response: ApiResponse<StudentRegistrationResponse> = {
            success: true,
            data: {
                registrationId: registration.id,
                email: registration.email,
                courseName: registration.course.name,
                saturdaySession: formatSessionTime(registration.saturdaySession.startTime, registration.saturdaySession.endTime),
                sundaySession: formatSessionTime(registration.sundaySession.startTime, registration.sundaySession.endTime),
                submittedAt: registration.createdAt.toISOString()
            },
            message: 'Registration submitted successfully'
        }

        return NextResponse.json(response, { status: 201 })
    } catch (error) {
        console.error('Registration failed:', error)
        return NextResponse.json(
            { success: false, error: 'Registration failed. Please try again.' },
            { status: 500 }
        )
    }
}

/**
 * Get session with availability calculation
 */
async function getSessionWithAvailability(sessionId: string, expectedDay: 'SATURDAY' | 'SUNDAY') {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
            saturdayStudents: { select: { id: true } },
            sundayStudents: { select: { id: true } },
            pendingSaturdayRegs: { where: { status: 'PENDING' }, select: { id: true } },
            pendingSundayRegs: { where: { status: 'PENDING' }, select: { id: true } }
        }
    })

    if (!session || session.day !== expectedDay) return null

    const approvedCount = expectedDay === 'SATURDAY'
        ? session.saturdayStudents.length
        : session.sundayStudents.length

    const pendingCount = expectedDay === 'SATURDAY'
        ? session.pendingSaturdayRegs.length
        : session.pendingSundayRegs.length

    const taken = approvedCount + pendingCount
    const available = session.capacity - taken

    return {
        ...session,
        available,
        isFull: available <= 0
    }
}

/**
 * Format session time for display
 */
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
