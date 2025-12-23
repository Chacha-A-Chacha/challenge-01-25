import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeAdditionalTeacher } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse, TeacherWithCourse } from "@/types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can remove additional teachers
    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Head teacher access required" },
        { status: 403 },
      );
    }

    const teacherId = params.id;

    if (!teacherId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Teacher ID is required" },
        { status: 400 },
      );
    }

    // Get the head teacher's course
    if (!session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No course assigned to head teacher" },
        { status: 400 },
      );
    }

    const deletedTeacher = await removeAdditionalTeacher(
      teacherId,
      session.user.courseId,
    );

    return NextResponse.json<ApiResponse<TeacherWithCourse>>({
      success: true,
      data: deletedTeacher,
      message: "Teacher removed successfully",
    });
  } catch (error) {
    console.error("Error removing teacher:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to remove teacher",
      },
      { status: 500 },
    );
  }
}
