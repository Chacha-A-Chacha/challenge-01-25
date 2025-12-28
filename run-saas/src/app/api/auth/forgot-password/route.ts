// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordResetTemplate } from "@/lib/email-templates";
import { EMAIL_CONFIG } from "@/lib/constants";
import crypto from "crypto";

interface ForgotPasswordRequest {
  email: string;
  userType: "student" | "admin" | "teacher";
}

export async function POST(request: NextRequest) {
  try {
    const { email, userType } = (await request.json()) as ForgotPasswordRequest;

    if (!email || !userType) {
      return NextResponse.json(
        { success: false, error: "Email and user type required" },
        { status: 400 },
      );
    }

    // Find user based on type
    let user: {
      id: string;
      email: string;
      firstName?: string;
      surname?: string;
    } | null = null;
    let name = "User";

    if (userType === "student") {
      user = await prisma.student.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, firstName: true, surname: true },
      });
      if (user && "firstName" in user && user.firstName) {
        name = user.firstName;
      }
    } else if (userType === "admin") {
      user = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true },
      });
    } else if (userType === "teacher") {
      user = await prisma.teacher.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true },
      });
    }

    // Always return success (prevent email enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(
      Date.now() + EMAIL_CONFIG.RESET_TOKEN.EXPIRY_MINUTES * 60 * 1000,
    );

    // Save token to database
    if (userType === "student") {
      await prisma.student.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });
    } else if (userType === "admin") {
      await prisma.admin.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });
    } else if (userType === "teacher") {
      await prisma.teacher.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });
    }

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&type=${userType}`;

    // Send email
    const html = passwordResetTemplate({
      name,
      resetUrl,
      expiryMinutes: EMAIL_CONFIG.RESET_TOKEN.EXPIRY_MINUTES,
    });

    await sendEmail({
      to: user.email,
      subject: EMAIL_CONFIG.SUBJECTS.PASSWORD_RESET,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}
