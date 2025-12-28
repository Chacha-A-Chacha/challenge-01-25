import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bulkMarkAttendance } from "@/lib/db";
import { bulkAttendanceSchema } from "@/lib/validations";
import { USER_ROLES } from "@/types";
import type { ApiResponse, AttendanceRecord } from "@/types";

/**
 * POST /api/attendance/scan/bulk
 * Bulk mark attendance for multiple students
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

    // Only teachers can bulk mark attendance
    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = bulkAttendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { sessionId, attendanceRecords } = validation.data;

    // Bulk mark attendance
    const attendances = await bulkMarkAttendance(
      sessionId,
      attendanceRecords,
      session.user.id,
    );

    // Transform the attendance records to match the API response format
    const attendanceRecordsList: AttendanceRecord[] = attendances.map(
      (attendance) => ({
        id: attendance.id,
        studentId: attendance.studentId,
        studentName:
          `${attendance.student?.firstName || ""} ${attendance.student?.lastName || ""}`.trim(),
        studentNumber: attendance.student?.studentNumber || "",
        sessionId: attendance.sessionId,
        date: attendance.date.toISOString(),
        status: attendance.status,
        scanTime: attendance.scanTime?.toISOString(),
      }),
    );

    return NextResponse.json<
      ApiResponse<{
        attendanceRecords: AttendanceRecord[];
        count: number;
      }>
    >({
      success: true,
      data: {
        attendanceRecords: attendanceRecordsList,
        count: attendanceRecordsList.length,
      },
    });
  } catch (error) {
    console.error("Error bulk marking attendance:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk mark attendance",
      },
      { status: 500 },
    );
  }
}
