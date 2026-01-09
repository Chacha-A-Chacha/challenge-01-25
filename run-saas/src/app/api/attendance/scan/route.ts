import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markAttendanceFromQR } from "@/lib/db";
import { qrScanSchema } from "@/lib/validations";
import { USER_ROLES } from "@/types";
import type { ApiResponse, AttendanceRecord } from "@/types";

/**
 * POST /api/attendance/scan
 * Scan QR code and mark attendance
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

    // Only teachers can scan QR codes
    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = qrScanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { qrData, sessionId } = validation.data;

    // Parse QR data (expected format: JSON string with uuid and student_id)
    let parsedQRData;
    try {
      parsedQRData = JSON.parse(qrData);
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid QR code format" },
        { status: 400 },
      );
    }

    if (!parsedQRData.uuid || !parsedQRData.student_id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "QR code missing required fields" },
        { status: 400 },
      );
    }

    // Mark attendance using QR data
    const result = await markAttendanceFromQR(
      parsedQRData,
      sessionId,
      session.user.id,
    );

    // Transform the attendance record to match the API response format
    const attendanceRecord: AttendanceRecord = {
      id: result.attendance.id,
      studentId: result.attendance.studentId,
      studentName:
        `${result.attendance.student?.surname || ""} ${result.attendance.student?.firstName || ""} ${result.attendance.student?.lastName || ""}`.trim(),
      studentNumber: result.attendance.student?.studentNumber || "",
      sessionId: result.attendance.sessionId,
      date: result.attendance.date.toISOString(),
      status: result.status,
      scanTime: result.attendance.scanTime?.toISOString(),
    };

    return NextResponse.json<
      ApiResponse<{
        attendance: AttendanceRecord;
        message: string;
        status: typeof result.status;
      }>
    >({
      success: true,
      data: {
        attendance: attendanceRecord,
        message: result.message,
        status: result.status,
      },
    });
  } catch (error) {
    console.error("Error scanning QR code:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to scan QR code",
      },
      { status: 500 },
    );
  }
}
