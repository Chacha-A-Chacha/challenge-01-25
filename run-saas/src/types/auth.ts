// types/auth.ts
import {UserRole, TeacherRole} from "@/types/enums";

export interface AuthUser {
    id: string
    email?: string
    role: UserRole
    studentNumber?: string
    uuid?: string
    surname?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    courseId?: string
    classId?: string
    teacherRole?: TeacherRole
}

export interface LoginCredentials {
    // Admin/Teacher login
    email?: string
    password?: string

    // Student login
    studentNumber?: string
    phoneNumber?: string
    surname?: string
    firstName?: string
    lastName?: string
}

export interface SessionData extends AuthUser {
    expires: string
}
