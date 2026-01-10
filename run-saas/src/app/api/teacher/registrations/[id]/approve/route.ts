// app/api/teacher/registrations/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/teacher/registrations/:id/approve
 * Approve a single registration and create student account
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const teacherId = session.user.id;

    // Get registration
    const registration = await prisma.studentRegistration.findUnique({
      where: { id },
      include: {
        saturdaySession: { include: { class: true } },
        sundaySession: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.REGISTRATION.NOT_FOUND },
        { status: 404 },
      );
    }

    if (registration.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.REGISTRATION.ALREADY_PROCESSED,
        },
        { status: 400 },
      );
    }

    // Verify teacher has access to this course
    if (registration.courseId !== session.user.courseId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Use transaction to create student and update registration
    const result = await prisma.$transaction(async (tx) => {
      // Generate student number
      const studentNumber = await generateStudentNumber(tx);

      // Create student
      const student = await tx.student.create({
        data: {
          studentNumber,
          surname: registration.surname,
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          phoneNumber: registration.phoneNumber,
          password: registration.password,
          classId: registration.saturdaySession.class.id,
          saturdaySessionId: registration.saturdaySessionId,
          sundaySessionId: registration.sundaySessionId,
          // Transfer portrait photo from registration
          photoUrl: registration.portraitPhotoUrl,
          photoKey: registration.portraitPhotoKey,
          photoProvider: registration.portraitPhotoProvider,
        },
      });

      // Update registration status
      await tx.studentRegistration.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: teacherId,
          reviewedAt: new Date(),
        },
      });

      return { student, studentNumber };
    });

    const response: ApiResponse<{ studentId: string; studentNumber: string }> =
      {
        success: true,
        data: {
          studentId: result.student.id,
          studentNumber: result.studentNumber,
        },
        message: "Registration approved successfully",
      };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Approval failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve registration" },
      { status: 500 },
    );
  }
}

/**
 * Generate sequential student number
 */
async function generateStudentNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const lastStudent = await tx.student.findFirst({
    orderBy: { createdAt: "desc" },
    select: { studentNumber: true },
  });

  let nextNum = 1;
  if (lastStudent?.studentNumber) {
    const match = lastStudent.studentNumber.match(/STU(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return `STU${nextNum.toString().padStart(5, "0")}`;
}
