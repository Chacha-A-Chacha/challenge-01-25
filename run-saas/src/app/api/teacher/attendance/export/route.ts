import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAttendanceExportData } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";

/**
 * GET /api/teacher/attendance/export
 * Export attendance data for teacher's course as CSV or JSON
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

    const courseId = session.user.courseId;

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const classId = searchParams.get("classId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const status = searchParams.get("status") || undefined;
    const format = searchParams.get("format") || "csv";

    // Validate required params
    if (!startDateParam || !endDateParam) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Start date must be before end date" },
        { status: 400 },
      );
    }

    // Get data scoped to teacher's course
    const data = await getAttendanceExportData({
      courseId, // Always filter by teacher's course
      classId,
      sessionId,
      startDate,
      endDate,
      status,
    });

    // Return JSON format
    if (format === "json") {
      return NextResponse.json<ApiResponse<typeof data>>({
        success: true,
        data,
      });
    }

    // Return CSV format
    if (data.length === 0) {
      return new NextResponse("No data available for export", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance-export-${startDateParam}-to-${endDateParam}.csv"`,
        },
      });
    }

    // Generate CSV
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","), // Header row
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value || "");
            if (stringValue.includes(",") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(","),
      ),
    ];

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance-export-${startDateParam}-to-${endDateParam}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting attendance data:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to export attendance data",
      },
      { status: 500 },
    );
  }
}
