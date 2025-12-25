// lib/validations.ts
import { z } from "zod";
import {
  VALIDATION_RULES,
  SESSION_RULES,
  CLASS_RULES,
  ERROR_MESSAGES,
} from "./constants";

export const emailSchema = z
  .string()
  .min(1, ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
  .max(
    VALIDATION_RULES.EMAIL.MAX_LENGTH,
    `Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters`,
  )
  .regex(VALIDATION_RULES.EMAIL.REGEX, ERROR_MESSAGES.VALIDATION.INVALID_EMAIL);

export const phoneSchema = z
  .string()
  .optional()
  .refine((phone) => !phone || VALIDATION_RULES.PHONE.LOCAL_REGEX.test(phone), {
    message: ERROR_MESSAGES.VALIDATION.INVALID_PHONE,
  });

export const requiredPhoneSchema = z
  .string()
  .min(1, ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
  .regex(
    VALIDATION_RULES.PHONE.LOCAL_REGEX,
    ERROR_MESSAGES.VALIDATION.INVALID_PHONE,
  );

export const studentNumberSchema = z
  .string()
  .min(VALIDATION_RULES.STUDENT_NUMBER.MIN_LENGTH)
  .max(VALIDATION_RULES.STUDENT_NUMBER.MAX_LENGTH)
  .regex(
    VALIDATION_RULES.STUDENT_NUMBER.REGEX,
    ERROR_MESSAGES.VALIDATION.INVALID_STUDENT_NUMBER,
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const nameSchema = z
  .string()
  .min(
    VALIDATION_RULES.NAME.MIN_LENGTH,
    `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`,
  )
  .max(
    VALIDATION_RULES.NAME.MAX_LENGTH,
    `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`,
  )
  .regex(VALIDATION_RULES.NAME.REGEX, "Name contains invalid characters");

export const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
  .refine((time) => {
    const [hours] = time.split(":").map(Number);
    return hours >= 8 && hours <= 18;
  }, "Session must be between 8:00 AM and 6:00 PM");

export const capacitySchema = z
  .number()
  .max(
    CLASS_RULES.MAX_CAPACITY,
    `Capacity cannot exceed ${CLASS_RULES.MAX_CAPACITY}`,
  );

export const uuidSchema = z.string().uuid("Invalid ID format");

export const adminTeacherLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const studentLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  userType: z.enum(["student", "admin", "teacher"]),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    userType: z.enum(["student", "admin", "teacher"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const createCourseSchema = z.object({
  courseName: z
    .string()
    .min(2, "Course name must be at least 2 characters")
    .max(100, "Course name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_&.()]+$/,
      "Course name contains invalid characters",
    ),

  headTeacherEmail: emailSchema,
  headTeacherPassword: passwordSchema,
});

export const updateCourseSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    endDate: z.date().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"] as const).optional(),
  })
  .partial();

export const addTeacherSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const replaceHeadTeacherSchema = z
  .object({
    courseId: uuidSchema,
    newHeadTeacherId: uuidSchema,
  })
  .refine((data) => data.courseId && data.newHeadTeacherId, {
    message: "Course ID and new head teacher ID are required",
  });

export const createClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(50, "Class name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Class name contains invalid characters"),

  capacity: capacitySchema,
});

export const createSessionSchema = z
  .object({
    day: z.enum(["SATURDAY", "SUNDAY"] as const),
    startTime: timeSchema,
    endTime: timeSchema,
    capacity: capacitySchema,
  })
  .refine(
    (data) => {
      const startMinutes =
        parseInt(data.startTime.split(":")[0]) * 60 +
        parseInt(data.startTime.split(":")[1]);
      const endMinutes =
        parseInt(data.endTime.split(":")[0]) * 60 +
        parseInt(data.endTime.split(":")[1]);
      const duration = endMinutes - startMinutes;

      return (
        duration >= SESSION_RULES.MIN_DURATION_MINUTES &&
        duration <= SESSION_RULES.MAX_DURATION_MINUTES
      );
    },
    {
      message: `Session must be between ${SESSION_RULES.MIN_DURATION_MINUTES} and ${SESSION_RULES.MAX_DURATION_MINUTES} minutes`,
      path: ["endTime"],
    },
  );

export const studentImportRowSchema = z.object({
  student_number: studentNumberSchema,
  first_name: nameSchema,
  last_name: nameSchema.optional(),
  email: emailSchema,
  phone_number: phoneSchema,
});

export const bulkStudentImportSchema = z.object({
  students: z
    .array(studentImportRowSchema)
    .min(1, "At least one student required"),
  classId: uuidSchema,
});

export const updateStudentSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    email: emailSchema.optional(),
    phoneNumber: phoneSchema,
  })
  .partial();

export const qrScanSchema = z.object({
  qrData: z.string().min(1, "QR data is required"),
  sessionId: uuidSchema,
});

export const markAttendanceSchema = z.object({
  studentId: uuidSchema,
  sessionId: uuidSchema,
  status: z.enum(["PRESENT", "ABSENT"] as const),
  date: z.date().optional(),
});

export const bulkAttendanceSchema = z.object({
  sessionId: uuidSchema,
  attendanceRecords: z
    .array(
      z.object({
        studentId: uuidSchema,
        status: z.enum(["PRESENT", "ABSENT"] as const),
      }),
    )
    .min(1, "At least one attendance record required"),
  date: z.date().optional(),
});

export const reassignmentRequestSchema = z
  .object({
    studentId: uuidSchema,
    fromSessionId: uuidSchema,
    toSessionId: uuidSchema,
    reason: z
      .string()
      .max(500, "Reason must be less than 500 characters")
      .optional(),
  })
  .refine((data) => data.fromSessionId !== data.toSessionId, {
    message: "Cannot reassign to the same session",
    path: ["toSessionId"],
  });

export const updateReassignmentSchema = z.object({
  status: z.enum(["APPROVED", "DENIED"] as const),
});

export const approveReassignmentSchema = z.object({
  requestId: uuidSchema,
});

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  });

export const attendanceFilterSchema = z.object({
  courseId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  sessionId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  status: z.enum(["PRESENT", "ABSENT", "WRONG_SESSION"] as const).optional(),
  dateRange: dateRangeSchema.optional(),
});

export function validateFormField<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
): { isValid: boolean; error?: string } {
  const result = schema.safeParse(value);

  if (result.success) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: result.error.issues[0]?.message || "Validation failed",
  };
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { isValid: boolean; errors: Record<string, string>; data?: T } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { isValid: true, errors: {}, data: result.data };
  }

  const errors: Record<string, string> = {};

  result.error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return { isValid: false, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const studentRegistrationSchema = z
  .object({
    // Course & Sessions
    courseId: uuidSchema,
    classId: uuidSchema,
    saturdaySessionId: uuidSchema,
    sundaySessionId: uuidSchema,

    // Personal Info
    surname: nameSchema,
    firstName: nameSchema,
    lastName: z
      .string()
      .max(VALIDATION_RULES.NAME.MAX_LENGTH)
      .optional()
      .or(z.literal("")),
    email: emailSchema,
    phoneNumber: phoneSchema,

    // Authentication
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),

    // Payment
    paymentReceiptUrl: z.string().url("Invalid receipt image URL"),
    paymentReceiptNo: z
      .string()
      .min(
        VALIDATION_RULES.RECEIPT_NUMBER.MIN_LENGTH,
        `Receipt number must be at least ${VALIDATION_RULES.RECEIPT_NUMBER.MIN_LENGTH} digits`,
      )
      .max(
        VALIDATION_RULES.RECEIPT_NUMBER.MAX_LENGTH,
        `Receipt number must be at most ${VALIDATION_RULES.RECEIPT_NUMBER.MAX_LENGTH} digits`,
      )
      .regex(
        VALIDATION_RULES.RECEIPT_NUMBER.REGEX,
        ERROR_MESSAGES.VALIDATION.INVALID_RECEIPT_NUMBER,
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ERROR_MESSAGES.VALIDATION.PASSWORDS_DONT_MATCH,
    path: ["confirmPassword"],
  });

export const rejectRegistrationSchema = z.object({
  reason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500, "Rejection reason must be at most 500 characters"),
});

export const bulkApprovalSchema = z.object({
  registrationIds: z
    .array(uuidSchema)
    .min(1, "At least one registration must be selected"),
});

export type StudentRegistrationInput = z.infer<
  typeof studentRegistrationSchema
>;
export type RejectRegistration = z.infer<typeof rejectRegistrationSchema>;
export type BulkApproval = z.infer<typeof bulkApprovalSchema>;
export type AdminTeacherLogin = z.infer<typeof adminTeacherLoginSchema>;
export type StudentLogin = z.infer<typeof studentLoginSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type CreateCourse = z.infer<typeof createCourseSchema>;
export type UpdateCourse = z.infer<typeof updateCourseSchema>;
export type AddTeacher = z.infer<typeof addTeacherSchema>;
export type ReplaceHeadTeacher = z.infer<typeof replaceHeadTeacherSchema>;
export type CreateClass = z.infer<typeof createClassSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
export type BulkStudentImport = z.infer<typeof bulkStudentImportSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
export type QRScan = z.infer<typeof qrScanSchema>;
export type MarkAttendance = z.infer<typeof markAttendanceSchema>;
export type BulkAttendance = z.infer<typeof bulkAttendanceSchema>;
export type ReassignmentRequest = z.infer<typeof reassignmentRequestSchema>;
export type UpdateReassignment = z.infer<typeof updateReassignmentSchema>;
export type ApproveReassignment = z.infer<typeof approveReassignmentSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type AttendanceFilter = z.infer<typeof attendanceFilterSchema>;
