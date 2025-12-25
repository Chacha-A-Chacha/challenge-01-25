import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { autoMarkAbsentForClass } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";
import { z } from "zod";

// Validation schema
const autoMarkAbsentSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  date: z.string().optional(),
});

/**
 * POST /api/attendance/auto-mark-absent
 * Automatically mark all students without attendance as absent
 * This should be called manually by teacher after all sessions for the day have ended
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can auto-mark absent
    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Forbidden - Head Teacher access required",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = autoMarkAbsentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { classId, date } = validation.data;
    const targetDate = date ? new Date(date) : undefined;

    // Auto-mark absent for students who didn't attend
    const result = await autoMarkAbsentForClass(
      classId,
      session.user.id,
      targetDate,
    );

    return NextResponse.json<
      ApiResponse<{
        markedAbsent: number;
        studentIds: string[];
      }>
    >({
      success: true,
      data: {
        markedAbsent: result.markedAbsent,
        studentIds: result.studentIds,
      },
    });
  } catch (error) {
    console.error("Error auto-marking absent:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to auto-mark absent",
      },
      { status: 500 },
    );
  }
}
