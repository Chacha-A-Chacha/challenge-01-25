// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"
import type { UserRole, TeacherRole } from "./auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string
      role: UserRole
      studentNumber?: string
      uuid?: string
      firstName?: string
      lastName?: string
      phoneNumber?: string
      courseId?: string
      classId?: string
      teacherRole?: TeacherRole
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email?: string
    role: UserRole
    studentNumber?: string
    uuid?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    courseId?: string
    classId?: string
    teacherRole?: TeacherRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    studentNumber?: string
    uuid?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    courseId?: string
    classId?: string
    teacherRole?: TeacherRole
  }
}
