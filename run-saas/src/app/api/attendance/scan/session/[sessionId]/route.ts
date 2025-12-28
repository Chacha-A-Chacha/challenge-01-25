import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionAttendanceWithRecords } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, AttendanceRecord, Session } from "@/types";

/**
 * GET /api/attendance/scan/session/[sessionId]
 * Get attendance records for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only teachers can view session attendance
    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    const { sessionId } = await params;

    // Get optional date parameter
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    // Get session attendance data
    const result = await getSessionAttendanceWithRecords(sessionId, date);

    // Transform session data
    const sessionData: Session = {
      id: result.session.id,
      classId: result.session.classId,
      day: result.session.day,
      startTime: result.session.startTime,
      endTime: result.session.endTime,
      capacity: result.session.capacity,
      createdAt: result.session.createdAt,
    };

    // Transform attendance records
    const attendanceRecords: AttendanceRecord[] = result.attendanceRecords.map(
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
        session: Session;
        attendanceRecords: AttendanceRecord[];
        totalStudents: number;
        stats: typeof result.stats;
      }>
    >({
      success: true,
      data: {
        session: sessionData,
        attendanceRecords,
        totalStudents: result.totalStudents,
        stats: result.stats,
      },
    });
  } catch (error) {
    console.error("Error fetching session attendance:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch session attendance",
      },
      { status: 500 },
    );
  }
}
