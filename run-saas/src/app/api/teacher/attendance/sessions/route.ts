import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface SessionHistoryData {
  sessionId: string;
  date: string;
  day: "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  className: string;
  classId: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  attendanceRate: number;
}

/**
 * GET /api/teacher/attendance/sessions
 * Get session history with attendance stats for the teacher's course
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
    const classIdParam = searchParams.get("classId");
    const dayParam = searchParams.get("day");

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

    // Build where clause for sessions
    const whereClause: any = {
      class: {
        courseId,
      },
    };

    if (classIdParam) {
      whereClause.classId = classIdParam;
    }

    if (dayParam === "SATURDAY" || dayParam === "SUNDAY") {
      whereClause.day = dayParam;
    }

    // Get all sessions matching filters
    const sessions = await prisma.session.findMany({
      where: whereClause,
      select: {
        id: true,
        day: true,
        startTime: true,
        endTime: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ class: { name: "asc" } }, { day: "asc" }, { startTime: "asc" }],
    });

    // For each session, get attendance records grouped by date
    const sessionHistory: SessionHistoryData[] = [];

    for (const session of sessions) {
      // Get attendance records for this session within date range
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          sessionId: session.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
          status: true,
        },
        orderBy: {
          date: "desc",
        },
      });

      // Group by date
      const recordsByDate = new Map<
        string,
        { present: number; absent: number; wrongSession: number; total: number }
      >();

      attendanceRecords.forEach((record) => {
        const dateKey = record.date.toISOString().split("T")[0];

        if (!recordsByDate.has(dateKey)) {
          recordsByDate.set(dateKey, {
            present: 0,
            absent: 0,
            wrongSession: 0,
            total: 0,
          });
        }

        const stats = recordsByDate.get(dateKey)!;
        stats.total++;

        if (record.status === "PRESENT") stats.present++;
        else if (record.status === "ABSENT") stats.absent++;
        else if (record.status === "WRONG_SESSION") stats.wrongSession++;
      });

      // Create a session history entry for each date
      recordsByDate.forEach((stats, date) => {
        const attendanceRate =
          stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

        sessionHistory.push({
          sessionId: session.id,
          date,
          day: session.day as "SATURDAY" | "SUNDAY",
          startTime: session.startTime,
          endTime: session.endTime,
          className: session.class.name,
          classId: session.class.id,
          totalStudents: stats.total,
          presentCount: stats.present,
          absentCount: stats.absent,
          wrongSessionCount: stats.wrongSession,
          attendanceRate,
        });
      });
    }

    // Sort by date descending
    sessionHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json<ApiResponse<SessionHistoryData[]>>({
      success: true,
      data: sessionHistory,
    });
  } catch (error) {
    console.error("Error getting session history:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get session history",
      },
      { status: 500 },
    );
  }
}
