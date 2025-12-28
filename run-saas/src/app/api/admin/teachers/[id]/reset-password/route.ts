import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";
import bcrypt from "bcryptjs";

export async function POST(
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

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const { id: teacherId } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Teacher not found" },
        { status: 404 },
      );
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.teacher.update({
      where: { id: teacherId },
      data: { password: hashedPassword },
    });

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Password reset successfully" },
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reset password",
      },
      { status: 500 },
    );
  }
}
