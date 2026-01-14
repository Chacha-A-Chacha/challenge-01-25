import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface AdditionalTeacherStats {
  course: {
    name: string;
    status: string;
    headTeacher: string;
  };
  assignedClasses: {
    total: number;
    saturday: number;
    sunday: number;
  };
  sessions: {
    total: number;
    saturday: number;
    sunday: number;
  };
  students: {
    total: number;
    withSessions: number;
    activeToday: number;
  };
  schedule: {
    nextSession: {
      day: string;
      time: string;
      className: string;
    } | null;
    thisWeek: number;
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

    // Only additional teachers can access this endpoint
    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.ADDITIONAL
    ) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Forbidden - Additional teacher access required",
        },
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
    const teacherId = session.user.id;

    // Get current day for next session calculation
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Fetch all stats in parallel
    const [
      course,
      classes,
      sessions,
      students,
      allSessions,
      headTeacher,
      reassignmentRequests,
      pendingReassignments,
    ] = await Promise.all([
      // Course info with head teacher
      prisma.course.findUnique({
        where: { id: courseId },
        select: {
          name: true,
          status: true,
          headTeacher: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // All classes in the course
      prisma.class.findMany({
        where: {
          courseId: courseId,
        },
        include: {
          sessions: {
            select: {
              id: true,
              day: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      }),

      // All sessions in the course
      prisma.session.findMany({
        where: {
          class: {
            courseId: courseId,
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
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      }),

      // Students in the course
      prisma.student.findMany({
        where: {
          class: {
            courseId: courseId,
          },
        },
        select: {
          id: true,
          saturdaySessionId: true,
          sundaySessionId: true,
          attendances: {
            where: {
              date: {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                lt: new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate() + 1,
                ),
              },
            },
            select: {
              id: true,
            },
          },
        },
      }),

      // Get all sessions for this week calculation
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

      // Get head teacher info
      prisma.teacher.findFirst({
        where: {
          role: TEACHER_ROLES.HEAD,
          headCourse: {
            id: courseId,
          },
        },
        select: {
          firstName: true,
          lastName: true,
        },
      }),

      // Total reassignment requests for the course
      prisma.reassignmentRequest.count({
        where: {
          student: {
            class: {
              courseId: courseId,
            },
          },
        },
      }),

      // Pending reassignment requests for the course
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

    // Calculate assigned classes stats (for additional teacher, it's all classes in the course)
    const saturdayClasses = classes.filter((c) =>
      c.sessions.some((s) => s.day === "SATURDAY"),
    ).length;
    const sundayClasses = classes.filter((c) =>
      c.sessions.some((s) => s.day === "SUNDAY"),
    ).length;

    const assignedClassesStats = {
      total: classes.length,
      saturday: saturdayClasses,
      sunday: sundayClasses,
    };

    // Calculate session stats
    const saturdaySessions = sessions.filter(
      (s) => s.day === "SATURDAY",
    ).length;
    const sundaySessions = sessions.filter((s) => s.day === "SUNDAY").length;

    const sessionStats = {
      total: sessions.length,
      saturday: saturdaySessions,
      sunday: sundaySessions,
    };

    // Calculate student stats
    const withSessions = students.filter(
      (s) => s.saturdaySessionId || s.sundaySessionId,
    ).length;
    const activeToday = students.filter((s) => s.attendances.length > 0).length;

    const studentStats = {
      total: students.length,
      withSessions,
      activeToday,
    };

    // Find next session
    let nextSession: {
      day: string;
      time: string;
      className: string;
    } | null = null;

    if (sessions.length > 0) {
      // Find the next upcoming session
      const sortedSessions = [...sessions].sort((a, b) => {
        const dayOrder = { SATURDAY: 6, SUNDAY: 0 };
        const dayA = dayOrder[a.day as keyof typeof dayOrder];
        const dayB = dayOrder[b.day as keyof typeof dayOrder];

        if (dayA !== dayB) {
          // Calculate days until each session
          const daysToA = (dayA - currentDay + 7) % 7 || 7;
          const daysToB = (dayB - currentDay + 7) % 7 || 7;
          return daysToA - daysToB;
        }

        // Same day, sort by time
        return a.startTime.localeCompare(b.startTime);
      });

      const next = sortedSessions[0];
      if (next) {
        nextSession = {
          day: next.day === "SATURDAY" ? "Saturday" : "Sunday",
          time: next.startTime,
          className: next.class.name,
        };
      }
    }

    // Calculate sessions this week
    const thisWeekCount = allSessions.filter((s) => {
      const sessionDay = s.day === "SATURDAY" ? 6 : 0;
      const daysUntil = (sessionDay - currentDay + 7) % 7;
      return daysUntil <= 7;
    }).length;

    const scheduleStats = {
      nextSession,
      thisWeek: thisWeekCount,
    };

    const headTeacherName = headTeacher
      ? `${headTeacher.firstName} ${headTeacher.lastName}`
      : course.headTeacher
        ? `${course.headTeacher.firstName} ${course.headTeacher.lastName}`
        : "N/A";

    const stats: AdditionalTeacherStats = {
      course: {
        name: course.name,
        status: course.status,
        headTeacher: headTeacherName,
      },
      assignedClasses: assignedClassesStats,
      sessions: sessionStats,
      students: studentStats,
      schedule: scheduleStats,
      reassignments: {
        pending: pendingReassignments,
        total: reassignmentRequests,
      },
    };

    return NextResponse.json<ApiResponse<AdditionalTeacherStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching additional teacher stats:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 },
    );
  }
}
