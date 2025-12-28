import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentById } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, StudentWithSessions } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Both head and additional teachers can view student details
    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    const { id: studentId } = await params;
    const student = await getStudentById(studentId);

    if (!student) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    // Verify student belongs to teacher's course
    if (student.class.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Student not in your course" },
        { status: 403 },
      );
    }

    return NextResponse.json<ApiResponse<StudentWithSessions>>({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch student",
      },
      { status: 500 },
    );
  }
}
