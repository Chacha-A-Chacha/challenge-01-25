import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { denyReassignmentRequest } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

export async function POST(
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

    // Both head and additional teachers can deny reassignment requests
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

    const { id } = params;

    await denyReassignmentRequest(id, session.user.id);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Reassignment request denied successfully" },
    });
  } catch (error) {
    console.error("Error denying reassignment request:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to deny reassignment request",
      },
      { status: 500 },
    );
  }
}
