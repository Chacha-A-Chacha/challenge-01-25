// app/api/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateForm, createCourseSchema } from "@/lib/validations";
import {
  createCourseWithHeadTeacher,
  getAccessibleCourses,
  handlePrismaError,
} from "@/lib/db";
import { hashPassword } from "@/lib/utils";
import { USER_ROLES } from "@/types";
import type {
  ApiResponse,
  CourseWithDetails,
  TeacherWithCourse,
} from "@/types";

/**
 * GET /api/courses
 * Fetch all courses (admin sees all, teachers see own)
 */
export async function GET(request: NextRequest) {
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

    const courses = await getAccessibleCourses(
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({
      success: true,
      data: courses,
    } as ApiResponse<CourseWithDetails[]>);
  } catch (error) {
    console.error("Error fetching courses:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch courses";

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
 * POST /api/courses
 * Create new course with head teacher (admin only)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate request body
    const validation = validateForm(createCourseSchema, body);
    if (!validation.isValid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: Object.values(validation.errors)[0] || "Invalid request data",
        } as ApiResponse<never>,
        { status: 400 },
      );
    }

    const {
      courseName,
      headTeacherEmail,
      headTeacherPassword,
      headTeacherFirstName,
      headTeacherLastName,
    } = validation.data;

    // Hash password
    const hashedPassword = await hashPassword(headTeacherPassword);

    // Create course with head teacher in transaction
    const result = await createCourseWithHeadTeacher(
      courseName,
      headTeacherEmail,
      hashedPassword,
      headTeacherFirstName,
      headTeacherLastName,
    );

    return NextResponse.json({
      success: true,
      data: {
        course: result.course,
        teacher: result.teacher,
      },
      message: "Course and head teacher created successfully",
    } as ApiResponse<{
      course: CourseWithDetails;
      teacher: TeacherWithCourse;
    }>);
  } catch (error) {
    console.error("Error creating course:", error);
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
