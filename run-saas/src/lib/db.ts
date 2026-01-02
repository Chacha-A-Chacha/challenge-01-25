// lib/db.ts
import { PrismaClient, Prisma } from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import type {
  Admin,
  TeacherWithCourse,
  StudentWithSessions,
  CourseWithDetails,
  ClassWithSessions,
  Session,
  Attendance,
  Student,
  StudentImportData,
  AutoAssignmentResult,
  AttendanceStats,
  QRCodeData,
  WeekDay,
  AttendanceStatus,
  CourseStatus,
  TeacherRole,
} from "@/types";
import { SESSION_RULES } from "./constants";
import { formatTime, parseTimeToMinutes, getStartEndOfDay } from "./utils";

// ============================================================================
// PRISMA CLIENT SETUP
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  },
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait || 5000,
    timeout: options?.timeout || 10000,
    isolationLevel:
      options?.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted,
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export function handlePrismaError(error: unknown): string {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("email")) {
          return "Email address is already in use";
        }
        if (target?.includes("studentNumber")) {
          return "Student number already exists in this class";
        }
        return "A record with this information already exists";

      case "P2025":
        return "The requested record was not found";

      case "P2003":
        return "Invalid reference to related record";

      default:
        return `Database error: ${error.message}`;
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return "Invalid data provided to database operation";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected database error occurred";
}

// ============================================================================
// AUTHENTICATION QUERIES
// ============================================================================

export async function findAdminByEmail(email: string): Promise<Admin | null> {
  try {
    return await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  } catch (error) {
    console.error("Error finding admin by email:", error);
    return null;
  }
}

export async function findTeacherByEmail(
  email: string,
): Promise<TeacherWithCourse | null> {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        course: true,
        headCourse: true,
      },
    });
    return teacher as TeacherWithCourse | null;
  } catch (error) {
    console.error("Error finding teacher by email:", error);
    return null;
  }
}

export async function findStudentByCredentials(
  studentNumber: string,
  phoneNumber?: string,
  email?: string,
): Promise<StudentWithSessions | null> {
  try {
    const baseWhere: Prisma.StudentWhereInput = {
      studentNumber: studentNumber.toUpperCase().trim(),
    };

    if (phoneNumber) baseWhere.phoneNumber = phoneNumber.trim();
    if (email) baseWhere.email = email.toLowerCase().trim();

    const student = await prisma.student.findFirst({
      where: baseWhere,
      include: {
        class: {
          include: {
            course: true,
            sessions: true,
          },
        },
        saturdaySession: true,
        sundaySession: true,
      },
    });
    return student as StudentWithSessions | null;
  } catch (error) {
    console.error("Error finding student by credentials:", error);
    return null;
  }
}

export async function findStudentByUUID(
  uuid: string,
): Promise<StudentWithSessions | null> {
  try {
    const student = await prisma.student.findUnique({
      where: { uuid },
      include: {
        class: {
          include: {
            course: true,
            sessions: true,
          },
        },
        saturdaySession: true,
        sundaySession: true,
      },
    });
    return student as StudentWithSessions | null;
  } catch (error) {
    console.error("Error finding student by UUID:", error);
    return null;
  }
}

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

export async function createCourseWithHeadTeacher(
  courseName: string,
  headTeacherEmail: string,
  hashedPassword: string,
  headTeacherFirstName?: string,
  headTeacherLastName?: string,
): Promise<{ course: CourseWithDetails; teacher: TeacherWithCourse }> {
  return withTransaction(async (tx) => {
    // Check if email already exists
    const existingTeacher = await tx.teacher.findUnique({
      where: { email: headTeacherEmail.toLowerCase().trim() },
    });

    if (existingTeacher) {
      throw new Error("Email address is already in use");
    }

    // Create head teacher first
    const headTeacher = await tx.teacher.create({
      data: {
        email: headTeacherEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: "HEAD" as TeacherRole,
        firstName: headTeacherFirstName?.trim(),
        lastName: headTeacherLastName?.trim(),
      },
    });

    // Create course with head teacher
    const courseResult = await tx.course.create({
      data: {
        name: courseName.trim(),
        headTeacherId: headTeacher.id,
        status: "ACTIVE" as CourseStatus,
      },
      include: {
        headTeacher: true,
        teachers: true,
        classes: {
          include: {
            sessions: true,
            students: true,
          },
        },
        _count: {
          select: {
            teachers: true,
            classes: true,
          },
        },
      },
    });

    // Update teacher with course relationship
    const teacherResult = await tx.teacher.update({
      where: { id: headTeacher.id },
      data: { courseId: courseResult.id },
      include: {
        course: true,
        headCourse: true,
      },
    });

    return {
      course: courseResult as unknown as CourseWithDetails,
      teacher: teacherResult as unknown as TeacherWithCourse,
    };
  });
}

/**
 * Replace head teacher for a course
 * - Validates new teacher exists and is available
 * - Demotes old head teacher to ADDITIONAL (or removes from course if preferred)
 * - Promotes new teacher to HEAD
 * - Updates all relationships atomically
 */
export async function replaceHeadTeacher(
  courseId: string,
  newHeadTeacherId: string,
  removeOldTeacher: boolean = false,
): Promise<{
  course: CourseWithDetails;
  oldTeacher: TeacherWithCourse;
  newTeacher: TeacherWithCourse;
}> {
  return withTransaction(async (tx) => {
    // 1. Fetch course with current head teacher
    const course = await tx.course.findUnique({
      where: { id: courseId },
      include: {
        headTeacher: true,
        teachers: true,
        classes: true,
      },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    const oldHeadTeacherId = course.headTeacherId;

    // 2. Validate new teacher exists and is not already a head teacher elsewhere
    const newTeacher = await tx.teacher.findUnique({
      where: { id: newHeadTeacherId },
      include: { headCourse: true, course: true },
    });

    if (!newTeacher) {
      throw new Error("New head teacher not found");
    }

    if (newTeacher.headCourse) {
      throw new Error(
        "This teacher is already a head teacher of another course",
      );
    }

    // 3. Cannot replace with the same teacher
    if (oldHeadTeacherId === newHeadTeacherId) {
      throw new Error(
        "New head teacher must be different from current head teacher",
      );
    }

    // 4. Update old head teacher - either remove or demote to ADDITIONAL
    const oldTeacherUpdate = removeOldTeacher
      ? { courseId: null, role: "ADDITIONAL" as TeacherRole }
      : { role: "ADDITIONAL" as TeacherRole };

    const oldTeacher = await tx.teacher.update({
      where: { id: oldHeadTeacherId },
      data: oldTeacherUpdate,
      include: { course: true, headCourse: true },
    });

    // 5. Update new head teacher - promote to HEAD and link to course
    const updatedNewTeacher = await tx.teacher.update({
      where: { id: newHeadTeacherId },
      data: {
        role: "HEAD" as TeacherRole,
        courseId: courseId,
      },
      include: { course: true, headCourse: true },
    });

    // 6. Update course with new head teacher
    const updatedCourse = await tx.course.update({
      where: { id: courseId },
      data: { headTeacherId: newHeadTeacherId },
      include: {
        headTeacher: true,
        teachers: true,
        classes: {
          include: {
            sessions: true,
            students: true,
          },
        },
        _count: {
          select: {
            teachers: true,
            classes: true,
          },
        },
      },
    });

    return {
      course: updatedCourse as unknown as CourseWithDetails,
      oldTeacher: oldTeacher as unknown as TeacherWithCourse,
      newTeacher: updatedNewTeacher as unknown as TeacherWithCourse,
    };
  });
}

/**
 * Get all teachers with their course details
 * Excludes soft-deleted teachers by default
 */
export async function getAllTeachers(
  includeDeleted: boolean = false,
): Promise<TeacherWithCourse[]> {
  try {
    const teachers = await prisma.teacher.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      include: {
        course: true,
        headCourse: {
          include: {
            classes: {
              include: {
                sessions: true,
                students: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return teachers as unknown as TeacherWithCourse[];
  } catch (error) {
    console.error("Error fetching teachers:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Soft delete a teacher (ADDITIONAL teachers only)
 * HEAD teachers must be replaced before deletion
 */
export async function softDeleteTeacher(
  teacherId: string,
): Promise<TeacherWithCourse> {
  return withTransaction(async (tx) => {
    // 1. Fetch teacher with course details
    const teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      include: {
        course: true,
        headCourse: true,
      },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    // 2. Check if already deleted
    if (teacher.isDeleted) {
      throw new Error("Teacher is already deleted");
    }

    // 3. Cannot delete HEAD teachers - must replace first
    if (teacher.role === "HEAD" || teacher.headCourse) {
      throw new Error(
        "Cannot delete a head teacher. Please replace the head teacher first.",
      );
    }

    // 4. Soft delete the teacher
    const deletedTeacher = await tx.teacher.update({
      where: { id: teacherId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      include: {
        course: true,
        headCourse: true,
      },
    });

    return deletedTeacher as TeacherWithCourse;
  });
}

/**
 * Add an additional teacher to a course (Head Teacher only)
 * Creates a new teacher account and assigns them to the course
 */
export async function addAdditionalTeacher(
  courseId: string,
  email: string,
  hashedPassword: string,
  firstName: string,
  lastName: string,
): Promise<TeacherWithCourse> {
  return withTransaction(async (tx) => {
    // 1. Verify course exists
    const course = await tx.course.findUnique({
      where: { id: courseId },
      include: { headTeacher: true },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // 2. Check if email already exists
    const existingTeacher = await tx.teacher.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingTeacher) {
      throw new Error("Email address is already in use");
    }

    // 3. Create additional teacher
    const newTeacher = await tx.teacher.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "ADDITIONAL" as TeacherRole,
        courseId: courseId,
      },
      include: {
        course: true,
        headCourse: true,
      },
    });

    return newTeacher as TeacherWithCourse;
  });
}

/**
 * Remove an additional teacher from a course (Head Teacher only)
 * Soft deletes the teacher
 */
export async function removeAdditionalTeacher(
  teacherId: string,
  courseId: string,
): Promise<TeacherWithCourse> {
  return withTransaction(async (tx) => {
    // 1. Fetch teacher
    const teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      include: {
        course: true,
        headCourse: true,
      },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    // 2. Verify teacher belongs to the course
    if (teacher.courseId !== courseId) {
      throw new Error("Teacher does not belong to this course");
    }

    // 3. Cannot remove head teachers
    if (teacher.role === "HEAD" || teacher.headCourse) {
      throw new Error("Cannot remove head teacher");
    }

    // 4. Check if already deleted
    if (teacher.isDeleted) {
      throw new Error("Teacher is already removed");
    }

    // 5. Soft delete the teacher
    const deletedTeacher = await tx.teacher.update({
      where: { id: teacherId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      include: {
        course: true,
        headCourse: true,
      },
    });

    return deletedTeacher as TeacherWithCourse;
  });
}

/**
 * Delete a course (only if no students, no attendance history, no pending registrations)
 */
export async function deleteCourse(courseId: string): Promise<void> {
  return withTransaction(async (tx) => {
    // Get course with related data
    const course = await tx.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            classes: true,
            teachers: true,
            registrations: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Check for students in any class within the course
    const studentCount = await tx.student.count({
      where: {
        class: {
          courseId,
        },
      },
    });

    if (studentCount > 0) {
      throw new Error(
        "Cannot delete course with students. Please reassign or remove students first.",
      );
    }

    // Check for pending or approved registrations
    const activeRegistrationCount = await tx.studentRegistration.count({
      where: {
        courseId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (activeRegistrationCount > 0) {
      throw new Error(
        "Cannot delete course with pending or approved registrations. Please process or reject registrations first.",
      );
    }

    // Check for attendance records across all sessions in all classes
    const attendanceCount = await tx.attendance.count({
      where: {
        session: {
          class: {
            courseId,
          },
        },
      },
    });

    if (attendanceCount > 0) {
      throw new Error(
        "Cannot delete course with attendance records. This course has historical data that must be preserved.",
      );
    }

    // Classes will be cascade deleted (onDelete: Cascade)
    // Sessions within those classes will also cascade delete
    // Reassignment requests on those sessions will cascade delete
    // Teachers will have courseId set to null (onDelete: SetNull)
    // Rejected/Expired registrations can remain or be deleted separately

    // Delete course (cascade will handle classes -> sessions -> reassignment requests)
    await tx.course.delete({
      where: { id: courseId },
    });
  });
}

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

/**
 * Get all classes for a course with sessions and students
 */
export async function getClassesByCourse(
  courseId: string,
): Promise<ClassWithSessions[]> {
  try {
    const classes = await prisma.class.findMany({
      where: { courseId },
      include: {
        sessions: true,
        students: true,
        course: true,
        _count: {
          select: {
            sessions: true,
            students: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return classes as unknown as ClassWithSessions[];
  } catch (error) {
    console.error("Error fetching classes:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Get a single class with full details
 */
export async function getClassById(
  classId: string,
): Promise<ClassWithSessions | null> {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        sessions: {
          orderBy: [{ day: "asc" }, { startTime: "asc" }],
        },
        students: true,
        _count: {
          select: {
            sessions: true,
            students: true,
          },
        },
      },
    });
    return classData as unknown as ClassWithSessions | null;
  } catch (error) {
    console.error("Error fetching class:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Create a new class (Head Teacher only)
 */
export async function createClass(
  courseId: string,
  name: string,
  capacity: number,
): Promise<ClassWithSessions> {
  try {
    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Create class
    const newClass = await prisma.class.create({
      data: {
        name: name.trim(),
        capacity,
        courseId,
      },
      include: {
        sessions: true,
        students: true,
        _count: {
          select: {
            sessions: true,
            students: true,
          },
        },
      },
    });

    return newClass as unknown as ClassWithSessions;
  } catch (error) {
    console.error("Error creating class:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Update a class
 */
export async function updateClass(
  classId: string,
  updates: { name?: string; capacity?: number },
): Promise<ClassWithSessions> {
  return withTransaction(async (tx) => {
    // Fetch class with student count
    const classToUpdate = await tx.class.findUnique({
      where: { id: classId },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    if (!classToUpdate) {
      throw new Error("Class not found");
    }

    // If reducing capacity, check if it would go below current student count
    if (
      updates.capacity !== undefined &&
      updates.capacity < classToUpdate._count.students
    ) {
      throw new Error(
        `Cannot reduce capacity below current student count (${classToUpdate._count.students})`,
      );
    }

    // Update class
    const updatedClass = await tx.class.update({
      where: { id: classId },
      data: updates,
      include: {
        sessions: true,
        students: true,
        _count: {
          select: {
            sessions: true,
            students: true,
          },
        },
      },
    });

    return updatedClass as unknown as ClassWithSessions;
  });
}

/**
 * Delete a class (only if no students, no attendance history, no pending registrations)
 */
export async function deleteClass(classId: string): Promise<void> {
  return withTransaction(async (tx) => {
    // Check if class has students
    const classToDelete = await tx.class.findUnique({
      where: { id: classId },
      include: {
        _count: {
          select: {
            students: true,
            sessions: true,
          },
        },
      },
    });

    if (!classToDelete) {
      throw new Error("Class not found");
    }

    if (classToDelete._count.students > 0) {
      throw new Error(
        "Cannot delete class with students. Please reassign students first.",
      );
    }

    // Check for attendance records across all sessions in this class
    const attendanceCount = await tx.attendance.count({
      where: {
        session: {
          classId,
        },
      },
    });

    if (attendanceCount > 0) {
      throw new Error(
        "Cannot delete class with attendance records. This class has historical data that must be preserved.",
      );
    }

    // Check for pending student registrations referencing any session in this class
    const registrationCount = await tx.studentRegistration.count({
      where: {
        OR: [{ saturdaySession: { classId } }, { sundaySession: { classId } }],
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (registrationCount > 0) {
      throw new Error(
        "Cannot delete class with pending student registrations. Please process or reject registrations first.",
      );
    }

    // Sessions will be cascade deleted automatically (onDelete: Cascade)
    // Orphaned reassignment requests on those sessions will also cascade delete

    // Delete class (cascade will handle sessions and their reassignment requests)
    await tx.class.delete({
      where: { id: classId },
    });
  });
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new session for a class
 * @param startTime - Time string in "HH:MM:SS" format (24-hour)
 * @param endTime - Time string in "HH:MM:SS" format (24-hour)
 */
export async function createSession(
  classId: string,
  day: WeekDay,
  startTime: string,
  endTime: string,
  capacity: number,
): Promise<Session> {
  return withTransaction(async (tx) => {
    // Verify class exists
    const classItem = await tx.class.findUnique({
      where: { id: classId },
      include: {
        sessions: true,
      },
    });

    if (!classItem) {
      throw new Error("Class not found");
    }

    // Validate time format (basic check)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new Error("Invalid time format. Use HH:MM:SS (24-hour)");
    }

    // Validate time range
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    // Check for time conflicts on the same day (using string comparison is safe for HH:MM:SS)
    const hasConflict = classItem.sessions.some((session) => {
      if (session.day !== day) return false;

      // Check if times overlap
      // Overlap occurs if: (start1 < end2) AND (start2 < end1)
      return startTime < session.endTime && session.startTime < endTime;
    });

    if (hasConflict) {
      throw new Error("Session time conflicts with an existing session");
    }

    // Create session
    const newSession = await tx.session.create({
      data: {
        classId,
        day,
        startTime,
        endTime,
        capacity,
      },
    });

    return newSession;
  });
}

/**
 * Update a session
 * @param startTime - Time string in "HH:MM:SS" format (24-hour)
 * @param endTime - Time string in "HH:MM:SS" format (24-hour)
 */
export async function updateSession(
  sessionId: string,
  updates: {
    day?: WeekDay;
    startTime?: string;
    endTime?: string;
    capacity?: number;
  },
): Promise<Session> {
  return withTransaction(async (tx) => {
    // Fetch session with student counts
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: {
            saturdayStudents: true,
            sundayStudents: true,
          },
        },
        class: {
          include: {
            sessions: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const studentCount =
      session.day === "SATURDAY"
        ? session._count.saturdayStudents
        : session._count.sundayStudents;

    // If reducing capacity, check student count
    if (updates.capacity !== undefined && updates.capacity < studentCount) {
      throw new Error(
        `Cannot reduce capacity below current student count (${studentCount})`,
      );
    }

    // Validate time format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (updates.startTime && !timeRegex.test(updates.startTime)) {
      throw new Error("Invalid start time format. Use HH:MM:SS (24-hour)");
    }
    if (updates.endTime && !timeRegex.test(updates.endTime)) {
      throw new Error("Invalid end time format. Use HH:MM:SS (24-hour)");
    }

    // If changing day or time, check for conflicts
    const dayToCheck = updates.day || session.day;
    const startToCheck = updates.startTime || session.startTime;
    const endToCheck = updates.endTime || session.endTime;

    // Validate time range
    if (startToCheck >= endToCheck) {
      throw new Error("Start time must be before end time");
    }

    const hasConflict = session.class.sessions.some((s) => {
      if (s.id === sessionId) return false; // Skip self
      if (s.day !== dayToCheck) return false;

      // Check if times overlap using string comparison
      return startToCheck < s.endTime && s.startTime < endToCheck;
    });

    if (hasConflict) {
      throw new Error("Session time conflicts with an existing session");
    }

    // Update session
    const updatedSession = await tx.session.update({
      where: { id: sessionId },
      data: updates,
    });

    return updatedSession;
  });
}

/**
 * Delete a session (only if no students assigned)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  return withTransaction(async (tx) => {
    // Get session with all related counts
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: {
            saturdayStudents: true,
            sundayStudents: true,
            attendances: true,
            pendingSaturdayRegs: true,
            pendingSundayRegs: true,
            fromRequests: true,
            toRequests: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Check for assigned students
    const studentCount =
      session.day === "SATURDAY"
        ? session._count.saturdayStudents
        : session._count.sundayStudents;

    if (studentCount > 0) {
      throw new Error(
        "Cannot delete session with assigned students. Please reassign students first.",
      );
    }

    // Check for attendance records (historical data must be preserved)
    if (session._count.attendances > 0) {
      throw new Error(
        "Cannot delete session with attendance records. This session has historical data that must be preserved.",
      );
    }

    // Check for pending registrations
    const registrationCount =
      session._count.pendingSaturdayRegs + session._count.pendingSundayRegs;

    if (registrationCount > 0) {
      throw new Error(
        "Cannot delete session with pending student registrations. Please process or reject registrations first.",
      );
    }

    // Reassignment requests will be cascade deleted automatically (onDelete: Cascade)
    // This is acceptable as they become orphaned without the session

    // Delete session (cascade will handle reassignment requests)
    await tx.session.delete({
      where: { id: sessionId },
    });
  });
}

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * Delete or soft-delete a student based on attendance history
 * - If student has NO attendance records: Hard delete (complete removal)
 * - If student HAS attendance records: Soft delete (preserve historical data)
 */
export async function deleteStudent(
  studentId: string,
): Promise<{ type: "hard" | "soft"; message: string }> {
  return withTransaction(async (tx) => {
    // Get student with attendance count
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: {
        _count: {
          select: {
            attendances: true,
            reassignmentRequests: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Check if already soft-deleted
    if (student.isDeleted) {
      throw new Error("Student is already deleted");
    }

    // If student has attendance records, must soft delete to preserve history
    if (student._count.attendances > 0) {
      await tx.student.update({
        where: { id: studentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return {
        type: "soft",
        message:
          "Student soft-deleted successfully. Attendance history preserved.",
      };
    }

    // No attendance records - safe to hard delete
    // Reassignment requests will cascade delete automatically
    await tx.student.delete({
      where: { id: studentId },
    });

    return {
      type: "hard",
      message: "Student permanently deleted successfully.",
    };
  });
}

/**
 * Get all students for a course with sessions
 */
export async function getStudentsByCourse(
  courseId: string,
): Promise<StudentWithSessions[]> {
  try {
    // Get all classes for the course
    const classes = await prisma.class.findMany({
      where: { courseId },
      select: { id: true },
    });

    const classIds = classes.map((c) => c.id);

    // Get students from those classes
    const students = await prisma.student.findMany({
      where: {
        classId: { in: classIds },
      },
      include: {
        class: {
          include: {
            course: true,
          },
        },
        saturdaySession: true,
        sundaySession: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return students as unknown as StudentWithSessions[];
  } catch (error) {
    console.error("Error fetching students:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Get a single student with full details
 */
export async function getStudentById(
  studentId: string,
): Promise<StudentWithSessions | null> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            course: true,
            sessions: true,
          },
        },
        saturdaySession: true,
        sundaySession: true,
        attendances: {
          orderBy: { date: "desc" },
          take: 10, // Last 10 attendance records
          include: {
            session: true,
          },
        },
      },
    });
    return student as unknown as StudentWithSessions | null;
  } catch (error) {
    console.error("Error fetching student:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function getAccessibleCourses(
  userId: string,
  userRole: string,
): Promise<CourseWithDetails[]> {
  try {
    let courseQuery: Prisma.CourseFindManyArgs;

    if (userRole === "admin") {
      courseQuery = {
        include: {
          headTeacher: true,
          teachers: true,
          classes: {
            include: {
              sessions: true,
              students: true,
            },
          },
          _count: {
            select: {
              teachers: true,
              classes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      };
    } else if (userRole === "teacher") {
      courseQuery = {
        where: {
          OR: [
            { headTeacherId: userId },
            { teachers: { some: { id: userId } } },
          ],
        },
        include: {
          headTeacher: true,
          teachers: true,
          classes: {
            include: {
              sessions: true,
              students: true,
            },
          },
          _count: {
            select: {
              teachers: true,
              classes: true,
            },
          },
        },
      };
    } else {
      return [];
    }

    const results = await prisma.course.findMany(courseQuery);
    return results as CourseWithDetails[];
  } catch (error) {
    console.error("Error getting accessible courses:", error);
    return [];
  }
}

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

export async function autoAssignStudentsToSessions(
  classId: string,
): Promise<AutoAssignmentResult> {
  return withTransaction(async (tx) => {
    const unassignedStudents = await tx.student.findMany({
      where: {
        classId,
        saturdaySessionId: null,
        sundaySessionId: null,
      },
    });

    if (unassignedStudents.length === 0) {
      return {
        assigned: 0,
        failed: 0,
        errors: [],
        assignments: [],
        unassigned: [] as Student[],
      } as AutoAssignmentResult;
    }

    const sessions = await tx.session.findMany({
      where: { classId },
      include: {
        _count: { select: { saturdayStudents: true, sundayStudents: true } },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    // Map sessions to include a unified student count based on day
    type SessionWithCount = Session & {
      _count: { saturdayStudents: number; sundayStudents: number };
      studentCount: number;
    };

    const sessionsWithCount: SessionWithCount[] = sessions.map((s) => ({
      ...s,
      studentCount:
        s.day === "SATURDAY"
          ? s._count.saturdayStudents
          : s._count.sundayStudents,
    }));

    const saturdaySessions = sessionsWithCount.filter(
      (s) => s.day === "SATURDAY",
    );
    const sundaySessions = sessionsWithCount.filter((s) => s.day === "SUNDAY");

    if (saturdaySessions.length === 0 || sundaySessions.length === 0) {
      return {
        assigned: 0,
        failed: unassignedStudents.length,
        errors: [
          "Both Saturday and Sunday sessions are required for assignment",
        ],
        assignments: [],
        unassigned: unassignedStudents as unknown as Student[],
      } as AutoAssignmentResult;
    }

    const assignments: Array<{
      studentId: string;
      saturdaySessionId: string;
      sundaySessionId: string;
    }> = [];

    const unassigned: Student[] = [];
    const errors: string[] = [];

    // Track current enrollment for balanced assignment
    const sessionEnrollment = new Map<string, number>();
    sessionsWithCount.forEach((session) => {
      sessionEnrollment.set(session.id, session.studentCount);
    });

    // Assign students to sessions with load balancing
    for (const student of unassignedStudents) {
      const availableSaturday = saturdaySessions
        .filter((s) => {
          const currentEnrollment = sessionEnrollment.get(s.id) ?? 0;
          return currentEnrollment < s.capacity;
        })
        .sort((a, b) => {
          const enrollmentA = sessionEnrollment.get(a.id) ?? 0;
          const enrollmentB = sessionEnrollment.get(b.id) ?? 0;
          return enrollmentA - enrollmentB;
        })[0];

      const availableSunday = sundaySessions
        .filter((s) => {
          const currentEnrollment = sessionEnrollment.get(s.id) ?? 0;
          return currentEnrollment < s.capacity;
        })
        .sort((a, b) => {
          const enrollmentA = sessionEnrollment.get(a.id) ?? 0;
          const enrollmentB = sessionEnrollment.get(b.id) ?? 0;
          return enrollmentA - enrollmentB;
        })[0];

      if (!availableSaturday || !availableSunday) {
        unassigned.push(student as unknown as Student);
        errors.push(
          `No available sessions for student ${student.studentNumber}`,
        );
        continue;
      }

      try {
        await tx.student.update({
          where: { id: student.id },
          data: {
            saturdaySessionId: availableSaturday.id,
            sundaySessionId: availableSunday.id,
          },
        });

        assignments.push({
          studentId: student.id,
          saturdaySessionId: availableSaturday.id,
          sundaySessionId: availableSunday.id,
        });

        // Update enrollment tracking
        const satEnrollment = sessionEnrollment.get(availableSaturday.id) ?? 0;
        const sunEnrollment = sessionEnrollment.get(availableSunday.id) ?? 0;
        sessionEnrollment.set(availableSaturday.id, satEnrollment + 1);
        sessionEnrollment.set(availableSunday.id, sunEnrollment + 1);
      } catch (error: unknown) {
        unassigned.push(student as unknown as Student);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(
          `Failed to assign student ${student.studentNumber}: ${errorMessage}`,
        );
      }
    }

    return {
      assigned: assignments.length,
      failed: unassigned.length,
      errors,
      assignments,
      unassigned: unassigned as unknown as Student[],
    } as AutoAssignmentResult;
  });
}

export async function bulkImportStudents(
  studentsData: StudentImportData[],
  classId: string,
): Promise<{
  success: number;
  failed: number;
  errors: string[];
  students: Student[];
}> {
  return withTransaction(async (tx) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      students: [] as Student[],
    };

    const classExists = await tx.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      throw new Error("Class not found");
    }

    // Process in batches
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < studentsData.length; i += batchSize) {
      batches.push(studentsData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (studentData, index) => {
        try {
          // Check for duplicates
          const existingStudent = await tx.student.findFirst({
            where: {
              studentNumber: studentData.student_number.toUpperCase().trim(),
              classId,
            },
          });

          if (existingStudent) {
            results.failed++;
            results.errors.push(
              `Row ${index + 1}: Student ${studentData.student_number} already exists`,
            );
            return null;
          }

          // Generate a default password hash (student should reset)
          const bcrypt = await import("bcryptjs");
          const defaultPasswordHash = await bcrypt.hash(
            studentData.student_number.toUpperCase().trim(),
            10,
          );

          // Determine surname: use provided surname, or last_name, or first_name as fallback
          const surname =
            studentData.surname?.trim() ||
            studentData.last_name?.trim() ||
            studentData.first_name.trim();

          const student = await tx.student.create({
            data: {
              studentNumber: studentData.student_number.toUpperCase().trim(),
              surname,
              firstName: studentData.first_name.trim(),
              lastName: studentData.last_name?.trim() || null,
              email: studentData.email.toLowerCase().trim(),
              phoneNumber: studentData.phone_number?.trim() || null,
              class: { connect: { id: classId } },
              password: defaultPasswordHash,
            },
          });

          results.success++;
          results.students.push(student as unknown as Student);
          return student;
        } catch (error: unknown) {
          results.failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`Row ${index + 1}: ${errorMessage}`);
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  });
}

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

export async function markAttendanceFromQR(
  qrData: QRCodeData,
  sessionId: string,
  teacherId: string,
): Promise<{
  attendance: Attendance;
  status: AttendanceStatus;
  message: string;
}> {
  return withTransaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { uuid: qrData.uuid },
      include: {
        saturdaySession: true,
        sundaySession: true,
        class: { include: { sessions: true } },
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    if (student.studentNumber !== qrData.student_id) {
      throw new Error("QR code data mismatch");
    }

    const session = await tx.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Check if today is correct day and within time window
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sessionDay = session.day === "SATURDAY" ? 6 : 0;

    if (dayOfWeek !== sessionDay) {
      throw new Error("QR code can only be scanned on the correct session day");
    }

    const currentTime = today.getHours() * 60 + today.getMinutes();
    const sessionStart =
      parseTimeToMinutes(session.startTime) - SESSION_RULES.EARLY_ENTRY_MINUTES;
    const sessionEnd =
      parseTimeToMinutes(session.endTime) + SESSION_RULES.LATE_ENTRY_MINUTES;

    if (currentTime < sessionStart || currentTime > sessionEnd) {
      throw new Error("QR code can only be scanned during session time window");
    }

    // Check for existing attendance today
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(today);
    const existingAttendance = await tx.attendance.findFirst({
      where: {
        studentId: student.id,
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    // Determine attendance status
    let status: AttendanceStatus;
    let message: string;

    // Check if student is assigned to this specific session
    const isAssignedToSession =
      student.saturdaySessionId === sessionId ||
      student.sundaySessionId === sessionId;

    // Check if session belongs to student's class (but not their assigned session)
    const isCorrectClass =
      student.class?.sessions?.some((s: Session) => s.id === sessionId) ??
      false;

    if (isAssignedToSession) {
      status = "PRESENT" as AttendanceStatus;
      message = "Attendance marked successfully";
    } else if (isCorrectClass) {
      status = "WRONG_SESSION" as AttendanceStatus;
      message = "Student scanned in wrong session but marked present";
    } else {
      throw new Error("Student is not enrolled in this class");
    }

    const attendanceData = {
      studentId: student.id,
      sessionId,
      date: dayStart,
      status,
      scanTime: new Date(),
      teacherId,
    };

    let attendance: Attendance;

    if (existingAttendance) {
      attendance = await tx.attendance.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true,
        },
      });
      message = `Updated attendance: ${message}`;
    } else {
      attendance = await tx.attendance.create({
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true,
        },
      });
    }

    return { attendance, status, message };
  });
}

/**
 * Mark attendance manually by teacher
 */
export async function markManualAttendance(
  studentId: string,
  sessionId: string,
  status: AttendanceStatus,
  teacherId: string,
): Promise<Attendance> {
  return withTransaction(async (tx) => {
    // Verify student exists and belongs to the class
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: {
        class: { include: { sessions: true } },
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Verify session exists
    const session = await tx.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Verify student is in the correct class
    const isCorrectClass =
      student.class?.sessions?.some((s: Session) => s.id === sessionId) ??
      false;

    if (!isCorrectClass) {
      throw new Error("Student is not enrolled in this class");
    }

    // Get today's date range
    const today = new Date();
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(today);

    // Check for existing attendance today
    const existingAttendance = await tx.attendance.findFirst({
      where: {
        studentId,
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    const attendanceData = {
      studentId,
      sessionId,
      date: dayStart,
      status,
      scanTime: new Date(),
      teacherId,
    };

    let attendance: Attendance;

    if (existingAttendance) {
      // Update existing attendance
      attendance = await tx.attendance.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true,
        },
      });
    } else {
      // Create new attendance record
      attendance = await tx.attendance.create({
        data: attendanceData,
        include: {
          student: true,
          session: true,
          markedBy: true,
        },
      });
    }

    return attendance;
  });
}

/**
 * Bulk mark attendance (used for marking multiple students)
 */
export async function bulkMarkAttendance(
  sessionId: string,
  attendanceRecords: Array<{ studentId: string; status: AttendanceStatus }>,
  teacherId: string,
): Promise<Attendance[]> {
  return withTransaction(async (tx) => {
    // Verify session exists
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            students: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const today = new Date();
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(today);

    const results: Attendance[] = [];

    for (const record of attendanceRecords) {
      // Verify student belongs to the class
      const studentInClass = session.class.students.some(
        (s: Student) => s.id === record.studentId,
      );

      if (!studentInClass) {
        throw new Error(
          `Student ${record.studentId} is not enrolled in this class`,
        );
      }

      // Check for existing attendance
      const existingAttendance = await tx.attendance.findFirst({
        where: {
          studentId: record.studentId,
          sessionId,
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      const attendanceData = {
        studentId: record.studentId,
        sessionId,
        date: dayStart,
        status: record.status,
        scanTime: new Date(),
        teacherId,
      };

      let attendance: Attendance;

      if (existingAttendance) {
        attendance = await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: attendanceData,
          include: {
            student: true,
            session: true,
            markedBy: true,
          },
        });
      } else {
        attendance = await tx.attendance.create({
          data: attendanceData,
          include: {
            student: true,
            session: true,
            markedBy: true,
          },
        });
      }

      results.push(attendance);
    }

    return results;
  });
}

/**
 * Get session attendance with full records
 */
export async function getSessionAttendanceWithRecords(
  sessionId: string,
  date?: Date,
): Promise<{
  session: Session;
  attendanceRecords: Attendance[];
  totalStudents: number;
  stats: AttendanceStats;
}> {
  try {
    const targetDate = date || new Date();
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(targetDate);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        saturdayStudents: true,
        sundayStudents: true,
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Get students assigned to this session based on the day
    const assignedStudents =
      session.day === "SATURDAY"
        ? session.saturdayStudents
        : session.sundayStudents;

    const totalStudents = assignedStudents?.length || 0;

    // Get all attendance records for this session today
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        sessionId,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      include: {
        student: true,
        session: true,
        markedBy: true,
      },
    });

    // Create attendance record map
    const attendanceMap = new Map(
      existingAttendance.map((a) => [a.studentId, a]),
    );

    // Build attendance records for ALL assigned students
    const attendanceRecords = (assignedStudents || []).map((student) => {
      const existing = attendanceMap.get(student.id);
      if (existing) {
        return existing;
      }
      // Return a placeholder record for students without attendance yet
      return {
        id: `placeholder-${student.id}`,
        studentId: student.id,
        sessionId,
        date: dayStart,
        status: null,
        scanTime: null,
        teacherId: null,
        student: student,
        session: session,
        markedBy: null,
      } as any;
    });

    const presentCount = attendanceRecords.filter(
      (a) => a.status === "PRESENT",
    ).length;
    const absentCount = attendanceRecords.filter(
      (a) => a.status === "ABSENT",
    ).length;
    const wrongSessionCount = attendanceRecords.filter(
      (a) => a.status === "WRONG_SESSION",
    ).length;

    const stats: AttendanceStats = {
      totalStudents,
      presentCount,
      absentCount,
      wrongSessionCount,
      attendanceRate:
        totalStudents > 0
          ? Math.round((presentCount / totalStudents) * 100)
          : 0,
      capacity: session.capacity,
      utilizationRate:
        session.capacity > 0
          ? Math.round((totalStudents / session.capacity) * 100)
          : 0,
    };

    return {
      session,
      attendanceRecords,
      totalStudents,
      stats,
    };
  } catch (error) {
    console.error("Error getting session attendance:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Auto-mark absent for students who didn't attend any session for the day
 * Should be called manually by teacher after all sessions for the day have ended
 */
export async function autoMarkAbsentForClass(
  classId: string,
  teacherId: string,
  date?: Date,
): Promise<{
  markedAbsent: number;
  studentIds: string[];
}> {
  return withTransaction(async (tx) => {
    const targetDate = date || new Date();
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(targetDate);

    // Get the class with all sessions and students
    const classData = await tx.class.findUnique({
      where: { id: classId },
      include: {
        sessions: true,
        students: {
          include: {
            attendances: {
              where: {
                date: {
                  gte: dayStart,
                  lt: dayEnd,
                },
              },
            },
          },
        },
      },
    });

    if (!classData) {
      throw new Error("Class not found");
    }

    // Determine which day we're checking (Saturday or Sunday)
    const dayOfWeek = targetDate.getDay();
    const sessionDay: WeekDay = dayOfWeek === 6 ? "SATURDAY" : "SUNDAY";

    // Get sessions for today
    const todaySessions = classData.sessions.filter(
      (s: Session) => s.day === sessionDay,
    );

    if (todaySessions.length === 0) {
      throw new Error(`No sessions found for ${sessionDay}`);
    }

    // Find students who have no attendance record for today
    const studentsToMarkAbsent: string[] = [];

    for (const student of classData.students) {
      // Check if student has any attendance record today
      const hasAttendanceToday = student.attendances.length > 0;

      if (!hasAttendanceToday) {
        // Get the student's assigned session for this day
        const studentSessions = await tx.session.findMany({
          where: {
            id: { in: student.sessions.map((s: { id: string }) => s.id) },
            day: sessionDay,
          },
        });

        // Mark absent in their assigned session (or first session if multiple)
        if (studentSessions.length > 0) {
          const assignedSession = studentSessions[0];

          await tx.attendance.create({
            data: {
              studentId: student.id,
              sessionId: assignedSession.id,
              date: dayStart,
              status: "ABSENT" as AttendanceStatus,
              scanTime: new Date(),
              teacherId,
            },
          });

          studentsToMarkAbsent.push(student.id);
        }
      }
    }

    return {
      markedAbsent: studentsToMarkAbsent.length,
      studentIds: studentsToMarkAbsent,
    };
  });
}

export async function getSessionAttendanceStats(
  sessionId: string,
  date?: Date,
): Promise<AttendanceStats> {
  try {
    const targetDate = date || new Date();
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(targetDate);

    const [session, attendanceRecords] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          _count: { select: { students: true } },
        },
      }),
      prisma.attendance.findMany({
        where: {
          sessionId,
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      }),
    ]);

    if (!session) {
      throw new Error("Session not found");
    }

    const totalStudents = session._count.students;
    const presentCount = attendanceRecords.filter(
      (a: Attendance) => a.status === "PRESENT",
    ).length;
    const absentCount = attendanceRecords.filter(
      (a: Attendance) => a.status === "ABSENT",
    ).length;
    const wrongSessionCount = attendanceRecords.filter(
      (a: Attendance) => a.status === "WRONG_SESSION",
    ).length;

    return {
      totalStudents,
      presentCount,
      absentCount,
      wrongSessionCount,
      attendanceRate:
        totalStudents > 0
          ? Math.round((presentCount / totalStudents) * 100)
          : 0,
      capacity: session.capacity,
      utilizationRate:
        session.capacity > 0
          ? Math.round((totalStudents / session.capacity) * 100)
          : 0,
    };
  } catch (error) {
    console.error("Error getting session attendance stats:", error);
    throw new Error(handlePrismaError(error));
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getDatabaseStats(): Promise<{
  admins: number;
  courses: number;
  teachers: number;
  classes: number;
  sessions: number;
  students: number;
  attendanceRecords: number;
  reassignmentRequests: number;
  lastUpdated: string;
}> {
  try {
    const [
      adminCount,
      courseCount,
      teacherCount,
      classCount,
      sessionCount,
      studentCount,
      attendanceCount,
      reassignmentCount,
    ] = await Promise.all([
      prisma.admin.count(),
      prisma.course.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.session.count(),
      prisma.student.count(),
      prisma.attendance.count(),
      prisma.reassignmentRequest.count(),
    ]);

    return {
      admins: adminCount,
      courses: courseCount,
      teachers: teacherCount,
      classes: classCount,
      sessions: sessionCount,
      students: studentCount,
      attendanceRecords: attendanceCount,
      reassignmentRequests: reassignmentCount,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting database stats:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function healthCheck(): Promise<{
  database: boolean;
  timestamp: string;
}> {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;

    return {
      database: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      database: false,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// REASSIGNMENT REQUEST MANAGEMENT (TEACHER)
// ============================================================================

export interface ReassignmentRequestDetail {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  fromSessionId: string;
  fromSessionDay: WeekDay;
  fromSessionTime: string;
  toSessionId: string;
  toSessionDay: WeekDay;
  toSessionTime: string;
  className: string;
  reason: string | null;
  requestedAt: Date;
  status: "PENDING" | "APPROVED" | "DENIED";
}

export async function getReassignmentRequestsByCourse(
  courseId: string,
): Promise<ReassignmentRequestDetail[]> {
  try {
    const requests = await prisma.reassignmentRequest.findMany({
      where: {
        student: {
          class: {
            courseId,
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            surname: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
        fromSession: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
        toSession: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return requests.map((req) => ({
      id: req.id,
      studentId: req.student.id,
      studentName: `${req.student.firstName} ${req.student.surname}`,
      studentNumber: req.student.studentNumber,
      fromSessionId: req.fromSession.id,
      fromSessionDay: req.fromSession.day,
      fromSessionTime: `${formatTime(req.fromSession.startTime)} - ${formatTime(req.fromSession.endTime)}`,
      toSessionId: req.toSession.id,
      toSessionDay: req.toSession.day,
      toSessionTime: `${formatTime(req.toSession.startTime)} - ${formatTime(req.toSession.endTime)}`,
      className: req.student.class.name,
      reason: req.reason,
      requestedAt: req.requestedAt,
      status: req.status,
    }));
  } catch (error) {
    console.error("Error getting reassignment requests:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function approveReassignmentRequest(
  requestId: string,
  teacherId: string,
): Promise<void> {
  try {
    await withTransaction(async (tx) => {
      // Get the request with all related data
      const request = await tx.reassignmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: {
            include: {
              class: true,
            },
          },
          fromSession: true,
          toSession: true,
        },
      });

      if (!request) {
        throw new Error("Reassignment request not found");
      }

      if (request.status !== "PENDING") {
        throw new Error("Request has already been processed");
      }

      // Validate same class
      if (request.fromSession.classId !== request.toSession.classId) {
        throw new Error("Can only reassign within the same class");
      }

      if (request.student.classId !== request.fromSession.classId) {
        throw new Error("Student is not in the same class as the sessions");
      }

      // Validate same day
      if (request.fromSession.day !== request.toSession.day) {
        throw new Error("Can only reassign within the same day");
      }

      // Check capacity in target session
      const toSessionDay = request.toSession.day;
      const studentCountInToSession = await tx.student.count({
        where:
          toSessionDay === "SATURDAY"
            ? { saturdaySessionId: request.toSession.id }
            : { sundaySessionId: request.toSession.id },
      });

      if (studentCountInToSession >= request.toSession.capacity) {
        throw new Error("Target session is at full capacity");
      }

      // Update the request status
      await tx.reassignmentRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          teacherId,
        },
      });

      // Update the student's session assignment
      const updateData =
        toSessionDay === "SATURDAY"
          ? { saturdaySessionId: request.toSession.id }
          : { sundaySessionId: request.toSession.id };

      await tx.student.update({
        where: { id: request.studentId },
        data: updateData,
      });
    });
  } catch (error) {
    console.error("Error approving reassignment request:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function denyReassignmentRequest(
  requestId: string,
  teacherId: string,
): Promise<void> {
  try {
    const request = await prisma.reassignmentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Reassignment request not found");
    }

    if (request.status !== "PENDING") {
      throw new Error("Request has already been processed");
    }

    await prisma.reassignmentRequest.update({
      where: { id: requestId },
      data: {
        status: "DENIED",
        teacherId,
      },
    });
  } catch (error) {
    console.error("Error denying reassignment request:", error);
    throw new Error(handlePrismaError(error));
  }
}

// ============================================================================
// STUDENT REASSIGNMENT MANAGEMENT
// ============================================================================

export interface StudentReassignmentRequest {
  id: string;
  fromSessionId: string;
  fromSessionDay: WeekDay;
  fromSessionTime: string;
  toSessionId: string;
  toSessionDay: WeekDay;
  toSessionTime: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  requestedAt: Date;
}

export interface AvailableSession {
  id: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  capacity: number;
  currentCount: number;
  availableSpots: number;
}

export async function getStudentReassignmentRequests(
  studentId: string,
): Promise<StudentReassignmentRequest[]> {
  try {
    const requests = await prisma.reassignmentRequest.findMany({
      where: {
        studentId,
      },
      include: {
        fromSession: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
        toSession: {
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return requests.map((req) => ({
      id: req.id,
      fromSessionId: req.fromSession.id,
      fromSessionDay: req.fromSession.day,
      fromSessionTime: `${formatTime(req.fromSession.startTime)} - ${formatTime(req.fromSession.endTime)}`,
      toSessionId: req.toSession.id,
      toSessionDay: req.toSession.day,
      toSessionTime: `${formatTime(req.toSession.startTime)} - ${formatTime(req.toSession.endTime)}`,
      reason: req.reason,
      status: req.status,
      requestedAt: req.requestedAt,
    }));
  } catch (error) {
    console.error("Error getting student reassignment requests:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function getAvailableReassignmentSessions(
  studentId: string,
): Promise<{ saturday: AvailableSession[]; sunday: AvailableSession[] }> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        classId: true,
        saturdaySessionId: true,
        sundaySessionId: true,
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    const sessions = await prisma.session.findMany({
      where: {
        classId: student.classId,
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    const saturdaySessions: AvailableSession[] = [];
    const sundaySessions: AvailableSession[] = [];

    for (const session of sessions) {
      const currentCount = await prisma.student.count({
        where:
          session.day === "SATURDAY"
            ? { saturdaySessionId: session.id }
            : { sundaySessionId: session.id },
      });

      const availableSpots = session.capacity - currentCount;

      const sessionData: AvailableSession = {
        id: session.id,
        day: session.day,
        startTime: formatTime(session.startTime),
        endTime: formatTime(session.endTime),
        capacity: session.capacity,
        currentCount,
        availableSpots,
      };

      if (session.day === "SATURDAY") {
        saturdaySessions.push(sessionData);
      } else {
        sundaySessions.push(sessionData);
      }
    }

    return {
      saturday: saturdaySessions,
      sunday: sundaySessions,
    };
  } catch (error) {
    console.error("Error getting available reassignment sessions:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function createReassignmentRequest(
  studentId: string,
  fromSessionId: string,
  toSessionId: string,
  reason?: string,
): Promise<StudentReassignmentRequest> {
  try {
    const result = await withTransaction(async (tx) => {
      // Validate student exists and get their info
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          classId: true,
          saturdaySessionId: true,
          sundaySessionId: true,
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Get sessions
      const [fromSession, toSession] = await Promise.all([
        tx.session.findUnique({ where: { id: fromSessionId } }),
        tx.session.findUnique({ where: { id: toSessionId } }),
      ]);

      if (!fromSession || !toSession) {
        throw new Error("Session not found");
      }

      // Validate same class
      if (
        fromSession.classId !== student.classId ||
        toSession.classId !== student.classId
      ) {
        throw new Error("Sessions must be from the same class");
      }

      // Validate same day
      if (fromSession.day !== toSession.day) {
        throw new Error("Can only reassign within the same day");
      }

      // Validate student is currently in the from session
      const currentSessionId =
        fromSession.day === "SATURDAY"
          ? student.saturdaySessionId
          : student.sundaySessionId;

      if (currentSessionId !== fromSessionId) {
        throw new Error("You are not enrolled in the source session");
      }

      // Check for existing pending request
      const existingRequest = await tx.reassignmentRequest.findFirst({
        where: {
          studentId,
          status: "PENDING",
        },
      });

      if (existingRequest) {
        throw new Error("You already have a pending reassignment request");
      }

      // Check capacity in target session
      const targetSessionCount = await tx.student.count({
        where:
          toSession.day === "SATURDAY"
            ? { saturdaySessionId: toSessionId }
            : { sundaySessionId: toSessionId },
      });

      if (targetSessionCount >= toSession.capacity) {
        throw new Error("Target session is at full capacity");
      }

      // Create the request
      const request = await tx.reassignmentRequest.create({
        data: {
          studentId,
          fromSessionId,
          toSessionId,
          reason: reason || null,
          status: "PENDING",
        },
        include: {
          fromSession: {
            select: {
              id: true,
              day: true,
              startTime: true,
              endTime: true,
            },
          },
          toSession: {
            select: {
              id: true,
              day: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      return {
        id: request.id,
        fromSessionId: request.fromSession.id,
        fromSessionDay: request.fromSession.day,
        fromSessionTime: `${formatTime(request.fromSession.startTime)} - ${formatTime(request.fromSession.endTime)}`,
        toSessionId: request.toSession.id,
        toSessionDay: request.toSession.day,
        toSessionTime: `${formatTime(request.toSession.startTime)} - ${formatTime(request.toSession.endTime)}`,
        reason: request.reason,
        status: request.status,
        requestedAt: request.requestedAt,
      };
    });

    return result;
  } catch (error) {
    console.error("Error creating reassignment request:", error);
    throw new Error(handlePrismaError(error));
  }
}

export async function deleteReassignmentRequest(
  requestId: string,
  studentId: string,
): Promise<void> {
  try {
    const request = await prisma.reassignmentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Reassignment request not found");
    }

    if (request.studentId !== studentId) {
      throw new Error("Unauthorized to delete this request");
    }

    if (request.status !== "PENDING") {
      throw new Error("Can only cancel pending requests");
    }

    await prisma.reassignmentRequest.delete({
      where: { id: requestId },
    });
  } catch (error) {
    console.error("Error deleting reassignment request:", error);
    throw new Error(handlePrismaError(error));
  }
}

// ============================================================================
// ADMIN ATTENDANCE FUNCTIONS
// ============================================================================

/**
 * Get attendance statistics for all courses
 */
export async function getAllCoursesAttendanceStats(
  startDate: Date,
  endDate: Date,
): Promise<
  Array<{
    courseId: string;
    courseName: string;
    courseStatus: string;
    totalStudents: number;
    totalClasses: number;
    totalSessions: number;
    attendanceRecords: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    wrongSessionCount: number;
    lastRecordedDate: string | null;
  }>
> {
  try {
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(startDate);
    const { end: endDayEnd } = getStartEndOfDay(endDate);

    const courses = await prisma.course.findMany({
      include: {
        classes: {
          include: {
            sessions: true,
            students: {
              include: {
                attendances: {
                  where: {
                    date: {
                      gte: dayStart,
                      lt: endDayEnd,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return courses.map((course) => {
      const totalStudents = course.classes.reduce(
        (sum, cls) => sum + cls.students.length,
        0,
      );
      const totalClasses = course.classes.length;
      const totalSessions = course.classes.reduce(
        (sum, cls) => sum + cls.sessions.length,
        0,
      );

      let totalAttendanceRecords = 0;
      let presentCount = 0;
      let absentCount = 0;
      let wrongSessionCount = 0;
      let lastRecordedDate: Date | null = null;

      course.classes.forEach((cls) => {
        cls.students.forEach((student) => {
          student.attendances.forEach((attendance) => {
            totalAttendanceRecords++;
            if (attendance.status === "PRESENT") presentCount++;
            if (attendance.status === "ABSENT") absentCount++;
            if (attendance.status === "WRONG_SESSION") wrongSessionCount++;

            if (!lastRecordedDate || attendance.date > lastRecordedDate) {
              lastRecordedDate = attendance.date;
            }
          });
        });
      });

      const attendanceRate =
        totalAttendanceRecords > 0
          ? Math.round((presentCount / totalAttendanceRecords) * 100)
          : 0;

      return {
        courseId: course.id,
        courseName: course.name,
        courseStatus: course.status,
        totalStudents,
        totalClasses,
        totalSessions,
        attendanceRecords: totalAttendanceRecords,
        attendanceRate,
        presentCount,
        absentCount,
        wrongSessionCount,
        lastRecordedDate: lastRecordedDate
          ? lastRecordedDate.toISOString()
          : null,
      };
    });
  } catch (error) {
    console.error("Error getting all courses attendance stats:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Get detailed attendance for a specific course
 */
export async function getCourseAttendanceDetail(
  courseId: string,
  startDate: Date,
  endDate: Date,
  sessionId?: string,
): Promise<{
  course: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string | null;
  };
  overallStats: {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    wrongSessionCount: number;
  };
  classBreakdown: Array<{
    classId: string;
    className: string;
    totalStudents: number;
    saturdaySessionsCount: number;
    sundaySessionsCount: number;
    totalSessionsCount: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    wrongSessionCount: number;
    lastRecordedDate: string | null;
  }>;
  sessions: Array<{
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    capacity: number;
    className: string;
  }>;
}> {
  try {
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(startDate);
    const { end: endDayEnd } = getStartEndOfDay(endDate);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classes: {
          include: {
            sessions: true,
            students: {
              include: {
                attendances: {
                  where: {
                    date: {
                      gte: dayStart,
                      lt: endDayEnd,
                    },
                    ...(sessionId ? { sessionId } : {}),
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    const totalStudents = course.classes.reduce(
      (sum, cls) => sum + cls.students.length,
      0,
    );
    const totalClasses = course.classes.length;

    let overallPresentCount = 0;
    let overallAbsentCount = 0;
    let overallWrongSessionCount = 0;
    let overallAttendanceRecords = 0;

    const classBreakdown = course.classes.map((cls) => {
      let presentCount = 0;
      let absentCount = 0;
      let wrongSessionCount = 0;
      let lastRecordedDate: Date | null = null;

      cls.students.forEach((student) => {
        student.attendances.forEach((attendance) => {
          if (attendance.status === "PRESENT") presentCount++;
          if (attendance.status === "ABSENT") absentCount++;
          if (attendance.status === "WRONG_SESSION") wrongSessionCount++;

          if (!lastRecordedDate || attendance.date > lastRecordedDate) {
            lastRecordedDate = attendance.date;
          }
        });
      });

      const totalRecords = presentCount + absentCount + wrongSessionCount;
      const attendanceRate =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      overallPresentCount += presentCount;
      overallAbsentCount += absentCount;
      overallWrongSessionCount += wrongSessionCount;
      overallAttendanceRecords += totalRecords;

      const saturdaySessionsCount = cls.sessions.filter(
        (s) => s.day === "SATURDAY",
      ).length;
      const sundaySessionsCount = cls.sessions.filter(
        (s) => s.day === "SUNDAY",
      ).length;

      return {
        classId: cls.id,
        className: cls.name,
        totalStudents: cls.students.length,
        saturdaySessionsCount,
        sundaySessionsCount,
        totalSessionsCount: cls.sessions.length,
        attendanceRate,
        presentCount,
        absentCount,
        wrongSessionCount,
        lastRecordedDate: lastRecordedDate
          ? lastRecordedDate.toISOString()
          : null,
      };
    });

    const overallAttendanceRate =
      overallAttendanceRecords > 0
        ? Math.round((overallPresentCount / overallAttendanceRecords) * 100)
        : 0;

    const sessions = course.classes.flatMap((cls) =>
      cls.sessions.map((session) => ({
        id: session.id,
        day: session.day,
        startTime: formatTime(session.startTime),
        endTime: formatTime(session.endTime),
        capacity: session.capacity,
        className: cls.name,
      })),
    );

    return {
      course: {
        id: course.id,
        name: course.name,
        status: course.status,
        startDate: course.createdAt.toISOString(),
        endDate: course.endDate ? course.endDate.toISOString() : null,
      },
      overallStats: {
        totalStudents,
        totalClasses,
        attendanceRate: overallAttendanceRate,
        presentCount: overallPresentCount,
        absentCount: overallAbsentCount,
        wrongSessionCount: overallWrongSessionCount,
      },
      classBreakdown,
      sessions,
    };
  } catch (error) {
    console.error("Error getting course attendance detail:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Get student attendance history
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    surname: string;
    email: string;
    phoneNumber: string | null;
    className: string;
    classId: string;
    saturdaySession: {
      id: string;
      time: string;
      className: string;
    };
    sundaySession: {
      id: string;
      time: string;
      className: string;
    };
  };
  attendanceRecords: Array<{
    id: string;
    date: string;
    day: string;
    sessionId: string;
    sessionName: string;
    sessionTime: string;
    status: string;
    scanTime: string | null;
    markedBy: string | null;
    markedByName: string | null;
  }>;
  stats: {
    totalClassDays: number;
    presentDays: number;
    absentDays: number;
    wrongSessionDays: number;
    attendanceRate: number;
    saturdayAttendanceRate: number;
    sundayAttendanceRate: number;
  };
}> {
  try {
    const { start: dayStart, end: dayEnd } = getStartEndOfDay(startDate);
    const { end: endDayEnd } = getStartEndOfDay(endDate);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        saturdaySession: true,
        sundaySession: true,
        attendances: {
          where: {
            date: {
              gte: dayStart,
              lt: endDayEnd,
            },
          },
          include: {
            session: {
              include: {
                class: true,
              },
            },
            markedBy: true,
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    const attendanceRecords = student.attendances.map((attendance) => ({
      id: attendance.id,
      date: attendance.date.toISOString(),
      day: attendance.session.day,
      sessionId: attendance.sessionId,
      sessionName: attendance.session.class.name,
      sessionTime: `${formatTime(attendance.session.startTime)} - ${formatTime(attendance.session.endTime)}`,
      status: attendance.status,
      scanTime: attendance.scanTime ? attendance.scanTime.toISOString() : null,
      markedBy: attendance.teacherId,
      markedByName: attendance.markedBy
        ? `${attendance.markedBy.firstName} ${attendance.markedBy.lastName}`
        : null,
    }));

    const presentDays = student.attendances.filter(
      (a) => a.status === "PRESENT",
    ).length;
    const absentDays = student.attendances.filter(
      (a) => a.status === "ABSENT",
    ).length;
    const wrongSessionDays = student.attendances.filter(
      (a) => a.status === "WRONG_SESSION",
    ).length;
    const totalClassDays = student.attendances.length;

    const saturdayAttendances = student.attendances.filter(
      (a) => a.session.day === "SATURDAY",
    );
    const sundayAttendances = student.attendances.filter(
      (a) => a.session.day === "SUNDAY",
    );

    const saturdayPresent = saturdayAttendances.filter(
      (a) => a.status === "PRESENT",
    ).length;
    const sundayPresent = sundayAttendances.filter(
      (a) => a.status === "PRESENT",
    ).length;

    const attendanceRate =
      totalClassDays > 0 ? Math.round((presentDays / totalClassDays) * 100) : 0;
    const saturdayAttendanceRate =
      saturdayAttendances.length > 0
        ? Math.round((saturdayPresent / saturdayAttendances.length) * 100)
        : 0;
    const sundayAttendanceRate =
      sundayAttendances.length > 0
        ? Math.round((sundayPresent / sundayAttendances.length) * 100)
        : 0;

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        surname: student.surname,
        email: student.email,
        phoneNumber: student.phoneNumber,
        className: student.class.name,
        classId: student.classId,
        saturdaySession: {
          id: student.saturdaySession.id,
          time: `${formatTime(student.saturdaySession.startTime)} - ${formatTime(student.saturdaySession.endTime)}`,
          className: student.class.name,
        },
        sundaySession: {
          id: student.sundaySession.id,
          time: `${formatTime(student.sundaySession.startTime)} - ${formatTime(student.sundaySession.endTime)}`,
          className: student.class.name,
        },
      },
      attendanceRecords,
      stats: {
        totalClassDays,
        presentDays,
        absentDays,
        wrongSessionDays,
        attendanceRate,
        saturdayAttendanceRate,
        sundayAttendanceRate,
      },
    };
  } catch (error) {
    console.error("Error getting student attendance history:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Search for students by name or student number
 */
export async function searchStudents(query: string): Promise<
  Array<{
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    surname: string;
    className: string;
    email: string;
  }>
> {
  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { studentNumber: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { surname: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        class: true,
      },
      take: 20,
      orderBy: {
        studentNumber: "asc",
      },
    });

    return students.map((student) => ({
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      surname: student.surname,
      className: student.class.name,
      email: student.email,
    }));
  } catch (error) {
    console.error("Error searching students:", error);
    throw new Error(handlePrismaError(error));
  }
}

/**
 * Get attendance data for export
 */
export async function getAttendanceExportData(filters: {
  courseId?: string;
  classId?: string;
  sessionId?: string;
  startDate: Date;
  endDate: Date;
  status?: string;
}): Promise<
  Array<{
    date: string;
    studentNumber: string;
    studentName: string;
    className: string;
    courseName: string;
    sessionDay: string;
    sessionTime: string;
    status: string;
    scanTime: string;
    markedBy: string;
  }>
> {
  try {
    const { start: dayStart } = getStartEndOfDay(filters.startDate);
    const { end: endDayEnd } = getStartEndOfDay(filters.endDate);

    const where: any = {
      date: {
        gte: dayStart,
        lt: endDayEnd,
      },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }

    if (filters.classId) {
      where.student = {
        classId: filters.classId,
      };
    }

    if (filters.courseId) {
      where.student = {
        class: {
          courseId: filters.courseId,
        },
      };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            class: {
              include: {
                course: true,
              },
            },
          },
        },
        session: true,
        markedBy: true,
      },
      orderBy: [{ date: "desc" }, { student: { studentNumber: "asc" } }],
    });

    return attendances.map((attendance) => ({
      date: attendance.date.toISOString().split("T")[0],
      studentNumber: attendance.student.studentNumber,
      studentName: `${attendance.student.surname}, ${attendance.student.firstName} ${attendance.student.lastName}`,
      className: attendance.student.class.name,
      courseName: attendance.student.class.course.name,
      sessionDay: attendance.session.day,
      sessionTime: `${formatTime(attendance.session.startTime)} - ${formatTime(attendance.session.endTime)}`,
      status: attendance.status,
      scanTime: attendance.scanTime ? attendance.scanTime.toISOString() : "N/A",
      markedBy: attendance.markedBy
        ? `${attendance.markedBy.firstName} ${attendance.markedBy.lastName}`
        : "System",
    }));
  } catch (error) {
    console.error("Error getting attendance export data:", error);
    throw new Error(handlePrismaError(error));
  }
}

// ============================================================================
// STUDENT REASSIGNMENT HELPERS
// ============================================================================

export interface AvailableSession {
  session: Session;
  availableSpots: number;
  canRequest: boolean;
}

/**
 * Get available sessions for reassignment for a student
 * Returns sessions grouped by day (Saturday/Sunday) that student can request to switch to
 */
export async function getAvailableReassignmentSessions(
  studentId: string,
): Promise<{ saturday: AvailableSession[]; sunday: AvailableSession[] }> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId, isDeleted: false },
      include: {
        class: {
          include: {
            sessions: true,
          },
        },
        saturdaySession: true,
        sundaySession: true,
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Get all sessions for the student's class
    const classSessions = student.class.sessions;

    // Count current students in each session
    const sessionCounts = await Promise.all(
      classSessions.map(async (session) => {
        const saturdayCount = await prisma.student.count({
          where: {
            saturdaySessionId: session.id,
            isDeleted: false,
          },
        });

        const sundayCount = await prisma.student.count({
          where: {
            sundaySessionId: session.id,
            isDeleted: false,
          },
        });

        const currentCount =
          session.day === "SATURDAY" ? saturdayCount : sundayCount;

        return {
          session,
          currentCount,
          availableSpots: session.capacity - currentCount,
          canRequest: currentCount < session.capacity,
        };
      }),
    );

    // Separate by day and filter out current sessions
    const saturday: AvailableSession[] = sessionCounts
      .filter(
        (s) =>
          s.session.day === "SATURDAY" &&
          s.session.id !== student.saturdaySession?.id,
      )
      .map((s) => ({
        session: s.session as Session,
        availableSpots: s.availableSpots,
        canRequest: s.canRequest,
      }));

    const sunday: AvailableSession[] = sessionCounts
      .filter(
        (s) =>
          s.session.day === "SUNDAY" &&
          s.session.id !== student.sundaySession?.id,
      )
      .map((s) => ({
        session: s.session as Session,
        availableSpots: s.availableSpots,
        canRequest: s.canRequest,
      }));

    return { saturday, sunday };
  } catch (error) {
    console.error("Error getting available reassignment sessions:", error);
    throw new Error(handlePrismaError(error));
  }
}

export default prisma;
export type { Prisma } from "@prisma/client";
