// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { passwordChangedTemplate } from "@/lib/email-templates";
import { EMAIL_CONFIG } from "@/lib/constants";

interface ResetPasswordRequest {
  token: string;
  password: string;
  userType: "student" | "admin" | "teacher";
}

export async function POST(request: NextRequest) {
  try {
    const { token, password, userType } =
      (await request.json()) as ResetPasswordRequest;

    if (!token || !password || !userType) {
      return NextResponse.json(
        { success: false, error: "Token, password, and user type required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Find user by token
    let user: {
      id: string;
      email: string;
      resetTokenExpiry: Date | null;
      firstName?: string;
    } | null = null;

    if (userType === "student") {
      user = await prisma.student.findFirst({
        where: { resetToken: token },
        select: {
          id: true,
          email: true,
          resetTokenExpiry: true,
          firstName: true,
        },
      });
    } else if (userType === "admin") {
      user = await prisma.admin.findFirst({
        where: { resetToken: token },
        select: { id: true, email: true, resetTokenExpiry: true },
      });
    } else if (userType === "teacher") {
      user = await prisma.teacher.findFirst({
        where: { resetToken: token },
        select: { id: true, email: true, resetTokenExpiry: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    // Check token expiry
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { success: false, error: "Reset token has expired" },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear token
    if (userType === "student") {
      await prisma.student.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    } else if (userType === "admin") {
      await prisma.admin.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    } else if (userType === "teacher") {
      await prisma.teacher.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
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
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
