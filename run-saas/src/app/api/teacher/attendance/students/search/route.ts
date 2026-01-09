import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

interface StudentSearchResult {
  studentId: string;
  studentNumber: string;
  fullName: string;
  className: string;
  classId: string;
}

/**
 * GET /api/teacher/attendance/students/search
 * Search for students in the teacher's course
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
    const query = searchParams.get("q");
    const classIdParam = searchParams.get("classId");

    if (!query || query.trim().length < 2) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Search query must be at least 2 characters" },
        { status: 400 },
      );
    }

    // Build where clause
    const whereClause: any = {
      class: {
        courseId,
      },
      isDeleted: false,
      OR: [
        { studentNumber: { contains: query.trim(), mode: "insensitive" } },
        { firstName: { contains: query.trim(), mode: "insensitive" } },
        { lastName: { contains: query.trim(), mode: "insensitive" } },
        { surname: { contains: query.trim(), mode: "insensitive" } },
        { email: { contains: query.trim(), mode: "insensitive" } },
      ],
    };

    if (classIdParam) {
      whereClause.classId = classIdParam;
    }

    // Search students
    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        lastName: true,
        surname: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 20, // Limit results
      orderBy: {
        studentNumber: "asc",
      },
    });

    const results: StudentSearchResult[] = students.map((student) => ({
      studentId: student.id,
      studentNumber: student.studentNumber,
      fullName: `${student.surname} ${student.firstName} ${student.lastName || ""}`.trim(),
      className: student.class.name,
      classId: student.class.id,
    }));

    return NextResponse.json<ApiResponse<StudentSearchResult[]>>({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error searching students:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search students",
      },
      { status: 500 },
    );
  }
}
