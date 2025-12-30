import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchStudents } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse, StudentSearchResult } from "@/types";

/**
 * GET /api/admin/attendance/students/search?q={query}
 * Search for students by name or student number
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Search query must be at least 2 characters",
        },
        { status: 400 },
      );
    }

    const results = await searchStudents(query.trim());

    return NextResponse.json<ApiResponse<StudentSearchResult[]>>({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error searching students:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search students",
      },
      { status: 500 },
    );
  }
}
