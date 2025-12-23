import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bulkApprovalSchema } from "@/lib/validations";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import type { ApiResponse } from "@/types";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only head teachers can approve registrations
    if (
      session.user.role !== USER_ROLES.TEACHER ||
      session.user.teacherRole !== TEACHER_ROLES.HEAD
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden - Head teacher access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validationResult = bulkApprovalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validationResult.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const { registrationIds } = validationResult.data;
    const teacherId = session.user.id;
    const courseId = session.user.courseId;

    if (!courseId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No course assigned to head teacher" },
        { status: 400 },
      );
    }

    // Process bulk approval in transaction
    const results = await prisma.$transaction(async (tx) => {
      const approved = [];
      const failed = [];

      for (const registrationId of registrationIds) {
        try {
          // Get registration
          const registration = await tx.studentRegistration.findUnique({
            where: { id: registrationId },
            include: {
              saturdaySession: { include: { class: true } },
              sundaySession: true,
            },
          });

          if (!registration) {
            failed.push({ id: registrationId, reason: "Registration not found" });
            continue;
          }

          // Verify belongs to teacher's course
          if (registration.courseId !== courseId) {
            failed.push({
              id: registrationId,
              reason: "Registration not in your course",
            });
            continue;
          }

          if (registration.status !== "PENDING") {
            failed.push({
              id: registrationId,
              reason: "Already processed",
            });
            continue;
          }

          // Check if email already exists
          const existingStudent = await tx.student.findUnique({
            where: { email: registration.email },
          });

          if (existingStudent) {
            failed.push({
              id: registrationId,
              reason: "Email already exists",
            });
            continue;
          }

          // Generate student number
          const classPrefix = registration.saturdaySession.class.name
            .substring(0, 3)
            .toUpperCase();
          const timestamp = Date.now().toString().slice(-6);
          const studentNumber = `${classPrefix}${timestamp}`;

          // Check if student number exists
          const existingNumber = await tx.student.findFirst({
            where: {
              studentNumber,
              classId: registration.saturdaySession.classId,
            },
          });

          if (existingNumber) {
            failed.push({
              id: registrationId,
              reason: "Student number conflict",
            });
            continue;
          }

          // Create student account
          await tx.student.create({
            data: {
              studentNumber,
              surname: registration.surname,
              firstName: registration.firstName,
              lastName: registration.lastName,
              email: registration.email,
              phoneNumber: registration.phoneNumber,
              passwordHash: registration.passwordHash,
              classId: registration.saturdaySession.classId,
              saturdaySessionId: registration.saturdaySessionId,
              sundaySessionId: registration.sundaySessionId,
            },
          });

          // Update registration status
          await tx.studentRegistration.update({
            where: { id: registrationId },
            data: {
              status: "APPROVED",
              reviewedById: teacherId,
              reviewedAt: new Date(),
            },
          });

          approved.push(registrationId);
        } catch (error) {
          console.error(`Error approving registration ${registrationId}:`, error);
          failed.push({
            id: registrationId,
            reason:
              error instanceof Error
                ? error.message
                : "Unknown error",
          });
        }
      }

      return { approved, failed };
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: results,
      message: `Approved ${results.approved.length} registrations. ${results.failed.length} failed.`,
    });
  } catch (error) {
    console.error("Error in bulk approval:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk approve registrations",
      },
      { status: 500 },
    );
  }
}
