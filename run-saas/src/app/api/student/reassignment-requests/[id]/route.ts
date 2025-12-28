import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteReassignmentRequest } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== USER_ROLES.STUDENT) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Student access required" },
        { status: 403 },
      );
    }

    const { id } = await params;

    await deleteReassignmentRequest(id, session.user.id);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Reassignment request cancelled successfully" },
    });
  } catch (error) {
    console.error("Error cancelling reassignment request:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel reassignment request",
      },
      { status: 500 },
    );
  }
}
