import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClassesByCourse, createClass } from "@/lib/db";
import { createClassSchema } from "@/lib/validations";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse, ClassWithSessions } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can access classes
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

    const classes = await getClassesByCourse(session.user.courseId);

    return NextResponse.json<ApiResponse<ClassWithSessions[]>>({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch classes",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can create classes
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

    const body = await request.json();
    const validationResult = createClassSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { name, capacity } = validationResult.data;

    const newClass = await createClass(session.user.courseId, name, capacity);

    return NextResponse.json<ApiResponse<ClassWithSessions>>(
      {
        success: true,
        data: newClass,
        message: "Class created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create class",
      },
      { status: 500 },
    );
  }
}
