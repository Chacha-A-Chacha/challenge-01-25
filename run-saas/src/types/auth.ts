// types/auth.ts
import { UserRole, TeacherRole } from "@/types/enums";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  studentNumber?: string;
  uuid?: string;
  surname?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  courseId?: string;
  classId?: string;
  teacherRole?: TeacherRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SessionData extends AuthUser {
  expires: string;
}

export type UserType = "student" | "admin" | "teacher";

export interface ForgotPasswordRequest {
  email: string;
  userType: UserType;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}
