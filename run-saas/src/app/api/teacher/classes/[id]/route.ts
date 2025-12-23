import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClassById, updateClass, deleteClass } from "@/lib/db";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse, ClassWithSessions } from "@/types";

export async function GET(
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

    const classId = params.id;
    const classData = await getClassById(classId);

    if (!classData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Class not found" },
        { status: 404 },
      );
    }

    // Verify class belongs to teacher's course
    if (classData.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Class not in your course" },
        { status: 403 },
      );
    }

    return NextResponse.json<ApiResponse<ClassWithSessions>>({
      success: true,
      data: classData,
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch class",
      },
      { status: 500 },
    );
  }
}

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

    const classId = params.id;

    // Verify class exists and belongs to teacher's course
    const existingClass = await getClassById(classId);
    if (!existingClass) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Class not found" },
        { status: 404 },
      );
    }

    if (existingClass.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Class not in your course" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, capacity } = body;

    const updatedClass = await updateClass(classId, { name, capacity });

    return NextResponse.json<ApiResponse<ClassWithSessions>>({
      success: true,
      data: updatedClass,
      message: "Class updated successfully",
    });
  } catch (error) {
    console.error("Error updating class:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update class",
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

    const classId = params.id;

    // Verify class exists and belongs to teacher's course
    const existingClass = await getClassById(classId);
    if (!existingClass) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Class not found" },
        { status: 404 },
      );
    }

    if (existingClass.courseId !== session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Class not in your course" },
        { status: 403 },
      );
    }

    await deleteClass(classId);

    return NextResponse.json<ApiResponse<void>>({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete class",
      },
      { status: 500 },
    );
  }
}
