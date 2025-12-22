import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { softDeleteTeacher } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, TeacherWithCourse } from "@/types";

export async function POST(
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

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Admin access required" },
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

    const deletedTeacher = await softDeleteTeacher(teacherId);

    return NextResponse.json<ApiResponse<TeacherWithCourse>>({
      success: true,
      data: deletedTeacher,
      message: "Teacher deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating teacher:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to deactivate teacher",
      },
      { status: 500 },
    );
  }
}
