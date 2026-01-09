import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface SessionDetailData {
  session: {
    id: string;
    date: string;
    day: "SATURDAY" | "SUNDAY";
    startTime: string;
    endTime: string;
    className: string;
  };
  attendanceRecords: {
    studentId: string;
    studentName: string;
    studentNumber: string;
    status: "PRESENT" | "ABSENT" | "WRONG_SESSION";
    scanTime?: string;
    markedBy?: string;
  }[];
}

/**
 * GET /api/teacher/attendance/sessions/[sessionId]/detail
 * Get detailed attendance records for a specific session on a specific date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== USER_ROLES.TEACHER) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Teacher access required" },
        { status: 403 },
      );
    }

    if (!session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No course assigned to teacher" },
        { status: 400 },
      );
    }

    const courseId = session.user.courseId;
    const sessionId = params.sessionId;

    // Get query params
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Date parameter is required" },
        { status: 400 },
      );
    }

    const date = new Date(dateParam);

    if (isNaN(date.getTime())) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid date format" },
        { status: 400 },
      );
    }

    // Get session and verify it belongs to teacher's course
    const sessionData = await prisma.session.findFirst({
      where: {
        id: sessionId,
        class: {
          courseId,
        },
      },
      select: {
        id: true,
        day: true,
        startTime: true,
        endTime: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!sessionData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Session not found or access denied" },
        { status: 404 },
      );
    }

    // Get attendance records for this session on this date
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        sessionId,
        date,
      },
      select: {
        status: true,
        scanTime: true,
        markedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            surname: true,
          },
        },
      },
      orderBy: {
        student: {
          studentNumber: "asc",
        },
      },
    });

    const detail: SessionDetailData = {
      session: {
        id: sessionData.id,
        date: date.toISOString().split("T")[0],
        day: sessionData.day as "SATURDAY" | "SUNDAY",
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        className: sessionData.class.name,
      },
      attendanceRecords: attendanceRecords.map((record) => ({
        studentId: record.student.id,
        studentName: `${record.student.surname} ${record.student.firstName} ${record.student.lastName || ""}`.trim(),
        studentNumber: record.student.studentNumber,
        status: record.status as "PRESENT" | "ABSENT" | "WRONG_SESSION",
        scanTime: record.scanTime || undefined,
        markedBy: record.markedBy
          ? `${record.markedBy.firstName} ${record.markedBy.lastName}`
          : undefined,
      })),
    };

    return NextResponse.json<ApiResponse<SessionDetailData>>({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("Error getting session detail:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get session detail",
      },
      { status: 500 },
    );
  }
}
