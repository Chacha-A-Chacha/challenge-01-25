// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { passwordChangedTemplate } from "@/lib/email-templates";
import { EMAIL_CONFIG } from "@/lib/constants";

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { currentPassword, newPassword } =
      (await request.json()) as ChangePasswordRequest;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current and new password required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be different from current password",
        },
        { status: 400 },
      );
    }

    const userType = session.user.role;
    const userId = session.user.id;
    let user: {
      id: string;
      email: string;
      password?: string;
      firstName?: string;
    } | null = null;

    // Get user with password
    if (userType === "STUDENT") {
      user = await prisma.student.findUnique({
        where: { id: userId },
        select: { id: true, email: true, password: true, firstName: true },
      });
    } else if (userType === "ADMIN") {
      user = await prisma.admin.findUnique({
        where: { id: userId },
        select: { id: true, email: true, password: true },
      });
    } else if (userType === "HEAD" || userType === "ADDITIONAL") {
      user = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { id: true, email: true, password: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Verify current password
    const currentHash = user.password;
    if (!currentHash) {
      return NextResponse.json(
        { success: false, error: "Invalid account state" },
        { status: 400 },
      );
    }

    const isValid = await verifyPassword(currentPassword, currentHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    if (userType === "STUDENT") {
      await prisma.student.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else if (userType === "ADMIN") {
      await prisma.admin.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else if (userType === "HEAD" || userType === "ADDITIONAL") {
      await prisma.teacher.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    // Send confirmation email
    const html = passwordChangedTemplate({
      name: "firstName" in user ? user.firstName || "User" : "User",
      changedAt: new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    await sendEmail({
      to: user.email,
      subject: EMAIL_CONFIG.SUBJECTS.PASSWORD_CHANGED,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 },
    );
  }
}
