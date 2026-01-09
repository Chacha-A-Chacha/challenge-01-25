import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface CourseOverviewStats {
  courseName: string;
  totalStudents: number;
  totalClasses: number;
  totalSessions: number;
  averageAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  totalRecords: number;
}

/**
 * GET /api/teacher/attendance/overview
 * Get course-wide attendance statistics for the teacher's course
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

    // Fetch course data
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true },
    });

    if (!course) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    // Get all classes in the course
    const classes = await prisma.class.findMany({
      where: { courseId },
      select: {
        id: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    const totalStudents = classes.reduce(
      (sum, cls) => sum + cls._count.students,
      0,
    );
    const totalClasses = classes.length;

    // Get all sessions in the course (within date range)
    const sessions = await prisma.session.findMany({
      where: {
        class: {
          courseId,
        },
      },
      select: {
        id: true,
      },
    });

    // Get all attendance records for the course within date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        session: {
          class: {
            courseId,
          },
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
      },
    });

    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const absentCount = attendanceRecords.filter(
      (r) => r.status === "ABSENT",
    ).length;
    const wrongSessionCount = attendanceRecords.filter(
      (r) => r.status === "WRONG_SESSION",
    ).length;

    // Calculate average attendance rate
    const averageAttendanceRate =
      totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    // Count unique session-date combinations (sessions held)
    const uniqueSessions = await prisma.attendance.findMany({
      where: {
        session: {
          class: {
            courseId,
          },
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        sessionId: true,
        date: true,
      },
      distinct: ["sessionId", "date"],
    });

    const totalSessions = uniqueSessions.length;

    const stats: CourseOverviewStats = {
      courseName: course.name,
      totalStudents,
      totalClasses,
      totalSessions,
      averageAttendanceRate,
      presentCount,
      absentCount,
      wrongSessionCount,
      totalRecords,
    };

    return NextResponse.json<ApiResponse<CourseOverviewStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting course overview:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get course overview",
      },
      { status: 500 },
    );
  }
}
