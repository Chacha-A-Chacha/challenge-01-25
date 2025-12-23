import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentsByCourse } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, StudentWithSessions } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Both head and additional teachers can view students
    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    if (!session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No course assigned to teacher" },
        { status: 400 },
      );
    }

    // Get optional class filter from query
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    let students = await getStudentsByCourse(session.user.courseId);

    // Filter by class if provided
    if (classId && classId !== "all") {
      students = students.filter((s) => s.classId === classId);
    }

    return NextResponse.json<ApiResponse<StudentWithSessions[]>>({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch students",
      },
      { status: 500 },
    );
  }
}
