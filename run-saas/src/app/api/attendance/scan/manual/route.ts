import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markManualAttendance } from "@/lib/db";
import { markAttendanceSchema } from "@/lib/validations";
import { USER_ROLES } from "@/types";
import type { ApiResponse, AttendanceRecord } from "@/types";

/**
 * POST /api/attendance/scan/manual
 * Manually mark attendance for a student
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only teachers can manually mark attendance
    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = markAttendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { studentId, sessionId, status } = validation.data;

    // Mark attendance manually
    const attendance = await markManualAttendance(
      studentId,
      sessionId,
      status,
      session.user.id,
    );

    // Transform the attendance record to match the API response format
    const attendanceRecord: AttendanceRecord = {
      id: attendance.id,
      studentId: attendance.studentId,
      studentName: `${attendance.student.firstName} ${attendance.student.lastName || ""}`.trim(),
      studentNumber: attendance.student.studentNumber,
      sessionId: attendance.sessionId,
      date: attendance.date.toISOString(),
      status: attendance.status,
      scanTime: attendance.scanTime?.toISOString(),
    };

    return NextResponse.json<ApiResponse<AttendanceRecord>>({
      success: true,
      data: attendanceRecord,
    });
  } catch (error) {
    console.error("Error marking attendance manually:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark attendance",
      },
      { status: 500 },
    );
  }
}
