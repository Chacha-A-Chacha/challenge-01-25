import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReassignmentRequestsByCourse } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";
import type { ReassignmentRequestDetail } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Both head and additional teachers can view reassignment requests
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

    // Get optional status filter from query
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let requests = await getReassignmentRequestsByCourse(
      session.user.courseId,
    );

    // Filter by status if provided
    if (statusFilter && statusFilter !== "all") {
      requests = requests.filter(
        (req) => req.status === statusFilter.toUpperCase(),
      );
    }

    return NextResponse.json<ApiResponse<ReassignmentRequestDetail[]>>({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching reassignment requests:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch reassignment requests",
      },
      { status: 500 },
    );
  }
}
