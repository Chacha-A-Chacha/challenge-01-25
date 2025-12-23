import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSession, getClassById } from "@/lib/db";
import { createSessionSchema } from "@/lib/validations";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse, Session } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can create sessions
    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Head teacher access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validationResult = createSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validationResult.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { day, startTime, endTime, capacity } = validationResult.data;
    const { classId } = body;

    if (!classId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Class ID is required" },
        { status: 400 },
      );
    }

    // Verify class exists and belongs to teacher's course
    const classData = await getClassById(classId);
    if (!classData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Class not found" },
        { status: 404 },
      );
    }

    if (classData.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Class not in your course" },
        { status: 403 },
      );
    }

    // Convert time strings to Date objects (using a fixed date for time-only comparison)
    const baseDate = new Date("2024-01-01");
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDateTime = new Date(baseDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(baseDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    const newSession = await createSession(
      classId,
      day,
      startDateTime,
      endDateTime,
      capacity,
    );

    return NextResponse.json<ApiResponse<Session>>(
      {
        success: true,
        data: newSession,
        message: "Session created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create session",
      },
      { status: 500 },
    );
  }
}
