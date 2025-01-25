// app/api/register/courses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { CoursePublic, ApiResponse } from '@/types'

/**
 * GET /api/register/courses
 * Public endpoint - returns active courses for registration dropdown
 */
export async function GET() {
    try {
        const courses = await prisma.course.findMany({
            where: {
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                status: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        const response: ApiResponse<CoursePublic[]> = {
            success: true,
            data: courses
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Failed to fetch courses:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch courses' },
            { status: 500 }
        )
    }
}
