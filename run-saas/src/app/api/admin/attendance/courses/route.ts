import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllCoursesAttendanceStats } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, CourseAttendanceStats } from "@/types";

/**
 * GET /api/admin/attendance/courses
 * Get attendance statistics for all courses
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

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to current month if not provided
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Start date must be before end date" },
        { status: 400 },
      );
    }

    const stats = await getAllCoursesAttendanceStats(startDate, endDate);

    return NextResponse.json<ApiResponse<CourseAttendanceStats[]>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting courses attendance stats:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get courses attendance stats",
      },
      { status: 500 },
    );
  }
}
