import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES, COURSE_STATUS } from "@/types";
import type { ApiResponse } from "@/types";

interface AdminStats {
  courses: {
    total: number;
    active: number;
    inactive: number;
    completed: number;
  };
  teachers: {
    total: number;
    headTeachers: number;
    additionalTeachers: number;
    withCourse: number;
  };
  classes: {
    total: number;
    totalCapacity: number;
    totalStudents: number;
    utilizationRate: number;
  };
  students: {
    total: number;
    withSessions: number;
    recentRegistrations: number;
  };
}

export async function GET(request: NextRequest) {
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

    // Fetch all stats in parallel
    const [courses, teachers, classes, students, recentRegistrations] =
      await Promise.all([
        // Course stats
        prisma.course.findMany({
          select: {
            status: true,
          },
        }),

        // Teacher stats
        prisma.teacher.findMany({
          where: { isDeleted: false },
          select: {
            role: true,
            courseId: true,
            headCourse: {
              select: { id: true },
            },
          },
        }),

        // Class stats
        prisma.class.findMany({
          select: {
            capacity: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        }),

        // Student stats
        prisma.student.findMany({
          select: {
            saturdaySessionId: true,
            sundaySessionId: true,
            createdAt: true,
          },
        }),

        // Recent registrations (last 7 days)
        prisma.student.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    // Calculate course stats
    const courseStats = {
      total: courses.length,
      active: courses.filter((c) => c.status === COURSE_STATUS.ACTIVE).length,
      inactive: courses.filter((c) => c.status === COURSE_STATUS.INACTIVE)
        .length,
      completed: courses.filter((c) => c.status === COURSE_STATUS.COMPLETED)
        .length,
    };

    // Calculate teacher stats
    const teacherStats = {
      total: teachers.length,
      headTeachers: teachers.filter((t) => t.role === TEACHER_ROLES.HEAD)
        .length,
      additionalTeachers: teachers.filter(
        (t) => t.role === TEACHER_ROLES.ADDITIONAL,
      ).length,
      withCourse: teachers.filter(
        (t) => t.courseId !== null || t.headCourse !== null,
      ).length,
    };

    // Calculate class stats
    const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
    const totalStudents = classes.reduce(
      (sum, c) => sum + c._count.students,
      0,
    );
    const utilizationRate =
      totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

    const classStats = {
      total: classes.length,
      totalCapacity,
      totalStudents,
      utilizationRate,
    };

    // Calculate student stats
    const studentStats = {
      total: students.length,
      withSessions: students.filter(
        (s) => s.saturdaySessionId || s.sundaySessionId,
      ).length,
      recentRegistrations,
    };

    const stats: AdminStats = {
      courses: courseStats,
      teachers: teacherStats,
      classes: classStats,
      students: studentStats,
    };

    return NextResponse.json<ApiResponse<AdminStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 },
    );
  }
}
