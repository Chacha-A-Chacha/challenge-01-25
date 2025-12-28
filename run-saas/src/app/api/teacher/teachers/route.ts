import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addAdditionalTeacher } from "@/lib/db";
import { addTeacherSchema } from "@/lib/validations";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse, TeacherWithCourse } from "@/types";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can add additional teachers
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
    const validationResult = addTeacherSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { email, password } = validationResult.data;

    // Get the head teacher's course
    if (!session.user.courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No course assigned to head teacher" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Add additional teacher to the course
    const newTeacher = await addAdditionalTeacher(
      session.user.courseId,
      email,
      hashedPassword,
    );

    return NextResponse.json<ApiResponse<TeacherWithCourse>>(
      {
        success: true,
        data: newTeacher,
        message: "Additional teacher added successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding additional teacher:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add teacher",
      },
      { status: 500 },
    );
  }
}
