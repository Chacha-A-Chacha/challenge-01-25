import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAvailableReassignmentSessions } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";
import type { AvailableSession } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    const sessions = await getAvailableReassignmentSessions(session.user.id);

    return NextResponse.json<
      ApiResponse<{ saturday: AvailableSession[]; sunday: AvailableSession[] }>
    >({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Error fetching available sessions:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch available sessions",
      },
      { status: 500 },
    );
  }
}
