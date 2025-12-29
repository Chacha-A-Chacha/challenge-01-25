import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface HeadTeacherStats {
  course: {
    name: string;
    status: string;
    endDate: Date | null;
    createdAt: Date;
  };
  teachers: {
    total: number;
    additional: number;
  };
  classes: {
    total: number;
    totalCapacity: number;
    totalStudents: number;
    utilizationRate: number;
  };
  sessions: {
    total: number;
    saturday: number;
    sunday: number;
  };
  students: {
    total: number;
    withSessions: number;
    recentRegistrations: number;
  };
  registrations: {
    pending: number;
    approvedThisWeek: number;
  };
  reassignments: {
    pending: number;
    total: number;
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

    // Only head teachers can access this endpoint
    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Head teacher access required" },
        { status: 403 },
      );
    }

    if (!session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No course assigned to head teacher" },
        { status: 400 },
      );
    }

    const courseId = session.user.courseId;

    // Fetch all stats in parallel
    const [
      course,
      teachers,
      classes,
      sessions,
      students,
      registrations,
      recentApprovals,
      reassignmentRequests,
      pendingReassignments,
    ] = await Promise.all([
      // Course info
      prisma.course.findUnique({
        where: { id: courseId },
        select: {
          name: true,
          status: true,
          endDate: true,
          createdAt: true,
        },
      }),

      // Teacher stats
      prisma.teacher.findMany({
        where: {
          courseId: courseId,
          isDeleted: false,
        },
        select: {
          role: true,
        },
      }),

      // Class stats
      prisma.class.findMany({
        where: { courseId: courseId },
        select: {
          capacity: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
      }),

      // Session stats
      prisma.session.findMany({
        where: {
          class: {
            courseId: courseId,
          },
        },
        select: {
          day: true,
        },
      }),

      // Student stats
      prisma.student.findMany({
        where: {
          class: {
            courseId: courseId,
          },
        },
        select: {
          saturdaySessionId: true,
          sundaySessionId: true,
          createdAt: true,
        },
      }),

      // Pending registrations
      prisma.studentRegistration.count({
        where: {
          courseId: courseId,
          status: "PENDING",
        },
      }),

      // Recent approvals (last 7 days)
      prisma.studentRegistration.count({
        where: {
          courseId: courseId,
          status: "APPROVED",
          reviewedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total reassignment requests
      prisma.reassignmentRequest.count({
        where: {
          student: {
            class: {
              courseId: courseId,
            },
          },
        },
      }),

      // Pending reassignment requests
      prisma.reassignmentRequest.count({
        where: {
          student: {
            class: {
              courseId: courseId,
            },
          },
          status: "PENDING",
        },
      }),
    ]);

    if (!course) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    // Calculate teacher stats
    const teacherStats = {
      total: teachers.length,
      additional: teachers.filter((t) => t.role === TEACHER_ROLES.ADDITIONAL)
        .length,
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

    // Calculate session stats
    const sessionStats = {
      total: sessions.length,
      saturday: sessions.filter((s) => s.day === "SATURDAY").length,
      sunday: sessions.filter((s) => s.day === "SUNDAY").length,
    };

    // Calculate student stats
    const recentRegistrations = students.filter((s) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(s.createdAt) > weekAgo;
    }).length;

    const studentStats = {
      total: students.length,
      withSessions: students.filter(
        (s) => s.saturdaySessionId || s.sundaySessionId,
      ).length,
      recentRegistrations,
    };

    const stats: HeadTeacherStats = {
      course: {
        name: course.name,
        status: course.status,
        endDate: course.endDate,
        createdAt: course.createdAt,
      },
      teachers: teacherStats,
      classes: classStats,
      sessions: sessionStats,
      students: studentStats,
      registrations: {
        pending: registrations,
        approvedThisWeek: recentApprovals,
      },
      reassignments: {
        pending: pendingReassignments,
        total: reassignmentRequests,
      },
    };

    return NextResponse.json<ApiResponse<HeadTeacherStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching head teacher stats:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 },
    );
  }
}
