import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface StudentAttendanceHistory {
  student: {
    studentNumber: string;
    fullName: string;
    className: string;
    classId: string;
    email: string;
    saturdaySession: {
      id: string;
      day: string;
      time: string;
    };
    sundaySession: {
      id: string;
      day: string;
      time: string;
    };
  };
  stats: {
    attendanceRate: number;
    saturdayAttendanceRate: number;
    sundayAttendanceRate: number;
    presentDays: number;
    absentDays: number;
    totalClassDays: number;
  };
  attendanceRecords: {
    date: string;
    day: string;
    sessionTime: string;
    status: "PRESENT" | "ABSENT" | "WRONG_SESSION";
    isCorrectSession: boolean;
  }[];
}

/**
 * GET /api/teacher/attendance/students/[studentId]
 * Get attendance history for a specific student (course-scoped)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } },
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
    const studentId = params.studentId;

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

    // Get student and verify they belong to teacher's course
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        class: {
          courseId,
        },
        isDeleted: false,
      },
      select: {
        studentNumber: true,
        firstName: true,
        lastName: true,
        surname: true,
        email: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        saturdaySession: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
        sundaySession: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
        saturdaySessionId: true,
        sundaySessionId: true,
      },
    });

    if (!student) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Student not found or access denied" },
        { status: 404 },
      );
    }

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        status: true,
        session: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Calculate stats
    const totalClassDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const absentDays = attendanceRecords.filter(
      (r) => r.status === "ABSENT",
    ).length;

    const attendanceRate =
      totalClassDays > 0 ? Math.round((presentDays / totalClassDays) * 100) : 0;

    // Saturday stats
    const saturdayRecords = attendanceRecords.filter(
      (r) => r.session.day === "SATURDAY",
    );
    const saturdayPresent = saturdayRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const saturdayAttendanceRate =
      saturdayRecords.length > 0
        ? Math.round((saturdayPresent / saturdayRecords.length) * 100)
        : 0;

    // Sunday stats
    const sundayRecords = attendanceRecords.filter(
      (r) => r.session.day === "SUNDAY",
    );
    const sundayPresent = sundayRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const sundayAttendanceRate =
      sundayRecords.length > 0
        ? Math.round((sundayPresent / sundayRecords.length) * 100)
        : 0;

    const history: StudentAttendanceHistory = {
      student: {
        studentNumber: student.studentNumber,
        fullName: `${student.surname} ${student.firstName} ${student.lastName || ""}`.trim(),
        className: student.class.name,
        classId: student.class.id,
        email: student.email,
        saturdaySession: {
          id: student.saturdaySession?.id || "",
          day: student.saturdaySession?.day || "SATURDAY",
          time: student.saturdaySession
            ? `${student.saturdaySession.startTime} - ${student.saturdaySession.endTime}`
            : "Not assigned",
        },
        sundaySession: {
          id: student.sundaySession?.id || "",
          day: student.sundaySession?.day || "SUNDAY",
          time: student.sundaySession
            ? `${student.sundaySession.startTime} - ${student.sundaySession.endTime}`
            : "Not assigned",
        },
      },
      stats: {
        attendanceRate,
        saturdayAttendanceRate,
        sundayAttendanceRate,
        presentDays,
        absentDays,
        totalClassDays,
      },
      attendanceRecords: attendanceRecords.map((record) => {
        const isCorrectSession =
          (record.session.day === "SATURDAY" &&
            record.session.id === student.saturdaySessionId) ||
          (record.session.day === "SUNDAY" &&
            record.session.id === student.sundaySessionId);

        return {
          date: record.date.toISOString().split("T")[0],
          day: record.session.day,
          sessionTime: `${record.session.startTime} - ${record.session.endTime}`,
          status: record.status as "PRESENT" | "ABSENT" | "WRONG_SESSION",
          isCorrectSession,
        };
      }),
    };

    return NextResponse.json<ApiResponse<StudentAttendanceHistory>>({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error getting student attendance history:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get student attendance history",
      },
      { status: 500 },
    );
  }
}
