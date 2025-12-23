import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateSession, deleteSession } from "@/lib/db";
import { prisma } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse, Session } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Head teacher access required" },
        { status: 403 },
      );
    }

    const sessionId = params.id;

    // Verify session exists and belongs to teacher's course
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
      },
    });

    if (!existingSession) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (existingSession.class.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Session not in your course" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { day, startTime, endTime, capacity } = body;

    const updates: any = {};
    if (day !== undefined) updates.day = day;
    if (capacity !== undefined) updates.capacity = capacity;

    // Convert time strings to Date if provided
    if (startTime) {
      const baseDate = new Date("2024-01-01");
      const [startHour, startMin] = startTime.split(":").map(Number);
      const startDateTime = new Date(baseDate);
      startDateTime.setHours(startHour, startMin, 0, 0);
      updates.startTime = startDateTime;
    }

    if (endTime) {
      const baseDate = new Date("2024-01-01");
      const [endHour, endMin] = endTime.split(":").map(Number);
      const endDateTime = new Date(baseDate);
      endDateTime.setHours(endHour, endMin, 0, 0);
      updates.endTime = endDateTime;
    }

    const updatedSession = await updateSession(sessionId, updates);

    return NextResponse.json<ApiResponse<Session>>({
      success: true,
      data: updatedSession,
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update session",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Head teacher access required" },
        { status: 403 },
      );
    }

    const sessionId = params.id;

    // Verify session exists and belongs to teacher's course
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
      },
    });

    if (!existingSession) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (existingSession.class.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Session not in your course" },
        { status: 403 },
      );
    }

    await deleteSession(sessionId);

    return NextResponse.json<ApiResponse<void>>({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete session",
      },
      { status: 500 },
    );
  }
}
