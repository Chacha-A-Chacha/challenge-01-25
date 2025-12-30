import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentAttendanceHistory } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, StudentAttendanceHistory } from "@/types";

/**
 * GET /api/admin/attendance/students/[studentId]
 * Get attendance history for a specific student
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
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

    const { studentId } = await params;

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to last 3 months if not provided
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const endDate = endDateParam ? new Date(endDateParam) : now;

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

    const history = await getStudentAttendanceHistory(
      studentId,
      startDate,
      endDate,
    );

    return NextResponse.json<ApiResponse<StudentAttendanceHistory>>({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error getting student attendance history:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get student attendance history",
      },
      { status: 500 },
    );
  }
}
