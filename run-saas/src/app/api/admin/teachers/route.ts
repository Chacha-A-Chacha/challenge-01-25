import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTeachers } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, TeacherWithCourse } from "@/types";

export async function GET(request: NextRequest) {
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

    const teachers = await getAllTeachers(false);

    return NextResponse.json<ApiResponse<TeacherWithCourse[]>>({
      success: true,
      data: teachers,
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch teachers",
      },
      { status: 500 },
    );
  }
}
