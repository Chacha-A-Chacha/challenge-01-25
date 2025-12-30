import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseAttendanceDetail } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, CourseAttendanceDetail } from "@/types";

/**
 * GET /api/admin/attendance/courses/[courseId]
 * Get detailed attendance for a specific course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
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

    const { courseId } = await params;

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sessionId = searchParams.get("sessionId") || undefined;

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

    const detail = await getCourseAttendanceDetail(
      courseId,
      startDate,
      endDate,
      sessionId,
    );

    return NextResponse.json<ApiResponse<CourseAttendanceDetail>>({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("Error getting course attendance detail:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get course attendance detail",
      },
      { status: 500 },
    );
  }
}
