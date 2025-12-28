// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateForm, updateCourseSchema } from "@/lib/validations";
import { prisma, handlePrismaError } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, CourseWithDetails } from "@/types";

/**
 * GET /api/courses/[id]
 * Fetch single course details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        } as ApiResponse<never>,
        { status: 401 },
      );
    }

    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        headTeacher: true,
        teachers: true,
        classes: {
          include: {
            sessions: true,
            students: true,
          },
        },
        _count: {
          select: {
            teachers: true,
            classes: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
        } as ApiResponse<never>,
        { status: 404 },
      );
    }

    // Check access: Admin sees all, teachers see only their course
    if (session.user.role !== USER_ROLES.ADMIN) {
      const isHeadTeacher = course.headTeacherId === session.user.id;
      const isAdditionalTeacher = course.teachers.some(
        (t) => t.id === session.user.id,
      );

      if (!isHeadTeacher && !isAdditionalTeacher) {
        return NextResponse.json(
          {
            success: false,
            error: "Access denied",
          } as ApiResponse<never>,
          { status: 403 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: course as unknown as CourseWithDetails,
    } as ApiResponse<CourseWithDetails>);
  } catch (error) {
    console.error("Error fetching course:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch course";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      } as ApiResponse<never>,
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/courses/[id]
 * Update course details (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        } as ApiResponse<never>,
        { status: 401 },
      );
    }

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions",
        } as ApiResponse<never>,
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = validateForm(updateCourseSchema, body);
    if (!validation.isValid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: Object.values(validation.errors)[0] || "Invalid request data",
        } as ApiResponse<never>,
        { status: 400 },
      );
    }

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
        } as ApiResponse<never>,
        { status: 404 },
      );
    }

    // Update course
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: validation.data,
      include: {
        headTeacher: true,
        teachers: true,
        classes: {
          include: {
            sessions: true,
            students: true,
          },
        },
        _count: {
          select: {
            teachers: true,
            classes: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCourse as unknown as CourseWithDetails,
      message: "Course updated successfully",
    } as ApiResponse<CourseWithDetails>);
  } catch (error) {
    console.error("Error updating course:", error);
    const errorMessage = handlePrismaError(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      } as ApiResponse<never>,
      { status: 500 },
    );
  }
}
