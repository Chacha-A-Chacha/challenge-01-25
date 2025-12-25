import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getStudentReassignmentRequests,
  createReassignmentRequest,
} from "@/lib/db";
import { reassignmentRequestSchema } from "@/lib/validations";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";
import type { StudentReassignmentRequest } from "@/lib/db";

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

    const requests = await getStudentReassignmentRequests(session.user.id);

    return NextResponse.json<ApiResponse<StudentReassignmentRequest[]>>({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching student reassignment requests:", error);
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate request body
    const validation = reassignmentRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 },
      );
    }

    const { fromSessionId, toSessionId, reason } = validation.data;

    const newRequest = await createReassignmentRequest(
      session.user.id,
      fromSessionId,
      toSessionId,
      reason,
    );

    return NextResponse.json<ApiResponse<StudentReassignmentRequest>>({
      success: true,
      data: newRequest,
    });
  } catch (error) {
    console.error("Error creating reassignment request:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create reassignment request",
      },
      { status: 500 },
    );
  }
}
