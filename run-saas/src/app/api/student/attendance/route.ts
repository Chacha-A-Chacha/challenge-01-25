import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentAttendanceHistory } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

/**
 * GET /api/student/attendance?limit=50
 * Get student's attendance history and statistics
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Default to last 3 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const attendanceData = await getStudentAttendanceHistory(
      session.user.id,
      startDate,
      endDate,
    );

    // Transform to match expected format
    const response = {
      attendanceRecords: attendanceData.attendanceRecords.slice(0, limit),
      stats: {
        totalSessions: attendanceData.stats.totalClassDays,
        attendedSessions: attendanceData.stats.presentDays,
        missedSessions: attendanceData.stats.absentDays,
        attendanceRate: attendanceData.stats.attendanceRate,
      },
    };

    return NextResponse.json<ApiResponse<typeof response>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch student attendance",
      },
      { status: 500 },
    );
  }
}
