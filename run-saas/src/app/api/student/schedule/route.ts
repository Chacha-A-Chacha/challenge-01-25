import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentById } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

/**
 * GET /api/student/schedule
 * Get student's schedule including course, class, and sessions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== USER_ROLES.STUDENT) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Student access required" },
        { status: 403 },
      );
    }

    const student = await getStudentById(session.user.id);

    if (!student) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    // Transform to match expected schedule format
    const scheduleData = {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentNumber: student.studentNumber,
      },
      class: student.class,
      course: student.class.course,
      saturdaySession: student.saturdaySession,
      sundaySession: student.sundaySession,
    };

    return NextResponse.json<ApiResponse<typeof scheduleData>>({
      success: true,
      data: scheduleData,
    });
  } catch (error) {
    console.error("Error fetching student schedule:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch student schedule",
      },
      { status: 500 },
    );
  }
}
