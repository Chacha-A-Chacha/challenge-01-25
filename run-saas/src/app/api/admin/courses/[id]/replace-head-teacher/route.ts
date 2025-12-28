// app/api/admin/courses/[id]/replace-head-teacher/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { replaceHeadTeacher } from "@/lib/db";
import { replaceHeadTeacherSchema } from "@/lib/validations";
import { USER_ROLES } from "@/types";

/**
 * Replace head teacher for a course
 * POST /api/admin/courses/[id]/replace-head-teacher
 *
 * Body:
 * - newHeadTeacherId: string (UUID of new head teacher)
 * - removeOldTeacher: boolean (optional - whether to remove old head teacher from course)
 *
 * Authorization: Admin only
 *
 * Process:
 * 1. Validates admin permission
 * 2. Validates new teacher exists and is available
 * 3. Demotes old head teacher to ADDITIONAL or removes from course
 * 4. Promotes new teacher to HEAD
 * 5. Updates course relationship
 * All in atomic transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate and authorize
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const { id: courseId } = await params;

    // 2. Parse and validate request body
    const body = await request.json();

    const validation = replaceHeadTeacherSchema.safeParse({
      courseId,
      newHeadTeacherId: body.newHeadTeacherId,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { newHeadTeacherId } = validation.data;
    const removeOldTeacher = body.removeOldTeacher === true;

    // 3. Execute head teacher replacement
    const result = await replaceHeadTeacher(
      courseId,
      newHeadTeacherId,
      removeOldTeacher,
    );

    // 4. Return success response
    return NextResponse.json({
      success: true,
      message: removeOldTeacher
        ? "Head teacher replaced successfully. Previous head teacher removed from course."
        : "Head teacher replaced successfully. Previous head teacher demoted to additional teacher.",
      data: {
        course: result.course,
        oldTeacher: {
          id: result.oldTeacher.id,
          email: result.oldTeacher.email,
          role: result.oldTeacher.role,
          courseId: result.oldTeacher.courseId,
        },
        newTeacher: {
          id: result.newTeacher.id,
          email: result.newTeacher.email,
          role: result.newTeacher.role,
          courseId: result.newTeacher.courseId,
        },
      },
    });
  } catch (error) {
    console.error("Replace head teacher error:", error);

    // Handle specific error messages from db.ts
    const errorMessage =
      error instanceof Error ? error.message : "Failed to replace head teacher";

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes("not found")) {
      statusCode = 404;
    } else if (
      errorMessage.includes("already a head teacher") ||
      errorMessage.includes("must be different")
    ) {
      statusCode = 400;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode },
    );
  }
}
