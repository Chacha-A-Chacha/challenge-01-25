import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface ClassBreakdownData {
  classId: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  lastRecordedDate: string | null;
}

/**
 * GET /api/teacher/attendance/classes
 * Get attendance breakdown by class for the teacher's course
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

    // Get all classes in the course
    const classes = await prisma.class.findMany({
      where: { courseId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: true,
          },
        },
        sessions: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // For each class, calculate attendance stats
    const classBreakdown: ClassBreakdownData[] = await Promise.all(
      classes.map(async (cls) => {
        const sessionIds = cls.sessions.map((s) => s.id);

        // Get all attendance records for this class within date range
        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            sessionId: {
              in: sessionIds,
            },
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            status: true,
            date: true,
            sessionId: true,
          },
        });

        const presentCount = attendanceRecords.filter(
          (r) => r.status === "PRESENT",
        ).length;
        const absentCount = attendanceRecords.filter(
          (r) => r.status === "ABSENT",
        ).length;
        const wrongSessionCount = attendanceRecords.filter(
          (r) => r.status === "WRONG_SESSION",
        ).length;

        const totalRecords = attendanceRecords.length;
        const attendanceRate =
          totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

        // Count unique session-date combinations
        const uniqueSessions = new Set(
          attendanceRecords.map(
            (r) => `${r.sessionId}-${r.date.toISOString().split("T")[0]}`,
          ),
        );
        const totalSessions = uniqueSessions.size;

        // Get last recorded date
        const lastRecord = attendanceRecords.reduce<Date | null>(
          (latest, r) => {
            if (!latest || r.date > latest) return r.date;
            return latest;
          },
          null,
        );

        return {
          classId: cls.id,
          className: cls.name,
          totalStudents: cls._count.students,
          totalSessions,
          attendanceRate,
          presentCount,
          absentCount,
          wrongSessionCount,
          lastRecordedDate: lastRecord
            ? lastRecord.toISOString().split("T")[0]
            : null,
        };
      }),
    );

    return NextResponse.json<ApiResponse<ClassBreakdownData[]>>({
      success: true,
      data: classBreakdown,
    });
  } catch (error) {
    console.error("Error getting class breakdown:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get class breakdown",
      },
      { status: 500 },
    );
  }
}
