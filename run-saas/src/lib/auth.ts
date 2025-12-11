// src/lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import {prisma} from "@/lib/db"
import type {UserRole, TeacherRole} from "@/types/enums"

interface AuthUserReturn {
    id: string
    role: UserRole
    email?: string
    studentNumber?: string
    uuid?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    classId?: string
    courseId?: string
    teacherRole?: TeacherRole
}

export const nextAuth = NextAuth({
    providers: [
        // Admin + Teacher
        Credentials({
            id: "admin-teacher",
            name: "Admin/Teacher Login",
            credentials: {
                email: {label: "Email", type: "email"},
                password: {label: "Password", type: "password"}
            },
            async authorize(credentials): Promise<AuthUserReturn | null> {
                const email = credentials?.email?.toLowerCase().trim()
                const password = credentials?.password
                if (!email || !password) return null

                // Admin
                const admin = await prisma.admin.findUnique({where: {email}})
                if (admin && await bcrypt.compare(password, admin.password)) {
                    return {id: admin.id, email: admin.email, role: "admin" as UserRole}
                }

                // Teacher
                const teacher = await prisma.teacher.findUnique({
                    where: {email},
                    include: {course: true, headCourse: true}
                })
                if (teacher && await bcrypt.compare(password, teacher.password)) {
                    return {
                        id: teacher.id,
                        email: teacher.email ?? undefined,
                        role: "teacher" as UserRole,
                        teacherRole: teacher.role as TeacherRole,
                        courseId: teacher.courseId ?? teacher.headCourse?.id
                    }
                }

                return null
            }
        }),

        // Student (Email + Password - New Flow)
        Credentials({
            id: "student",
            name: "Student Login",
            credentials: {
                email: {label: "Email", type: "email"},
                password: {label: "Password", type: "password"}
            },
            async authorize(credentials): Promise<AuthUserReturn | null> {
                const email = credentials?.email?.toLowerCase().trim()
                const password = credentials?.password

                if (!email || !password) return null

                const student = await prisma.student.findUnique({
                    where: {email},
                    include: {class: {include: {course: true}}}
                })

                if (!student) return null

                // Verify password
                const isValid = await bcrypt.compare(password, student.passwordHash)
                if (!isValid) return null

                return {
                    id: student.id,
                    role: "student" as UserRole,
                    email: student.email,
                    studentNumber: student.studentNumber,
                    uuid: student.uuid,
                    firstName: student.firstName,
                    lastName: student.lastName ?? undefined,
                    phoneNumber: student.phoneNumber ?? undefined,
                    classId: student.classId,
                    courseId: student.class?.course?.id
                }
            }
        }),
    ],

    pages: {
        signIn: "/login",
        error: "/login"
    },

    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60 // 8 hours
    },

    callbacks: {
        async jwt({token, user, trigger, session}) {
            if (user) {
                const u = user as AuthUserReturn
                token.id = u.id
                token.role = u.role
                token.email = u.email
                token.studentNumber = u.studentNumber
                token.uuid = u.uuid
                token.firstName = u.firstName
                token.lastName = u.lastName
                token.phoneNumber = u.phoneNumber
                token.classId = u.classId
                token.courseId = u.courseId
                token.teacherRole = u.teacherRole
            }

            if (trigger === "update" && session) {
                Object.assign(token, session)
            }

            return token
        },

        async session({session, token}) {
            if (token?.id && token?.role) {
                session.user = {
                    ...session.user,
                    id: String(token.id),
                    role: token.role as UserRole,
                    email: (token.email as string) ?? session.user?.email,
                    studentNumber: token.studentNumber as string | undefined,
                    uuid: token.uuid as string | undefined,
                    firstName: token.firstName as string | undefined,
                    lastName: token.lastName as string | undefined,
                    phoneNumber: token.phoneNumber as string | undefined,
                    classId: token.classId as string | undefined,
                    courseId: token.courseId as string | undefined,
                    teacherRole: token.teacherRole as TeacherRole | undefined,
                } as typeof session.user
            }
            return session
        },
    },

    debug: process.env.NODE_ENV === "development",
})

export const handlers = nextAuth.handlers
export const auth = nextAuth.auth
export const signIn = nextAuth.signIn
export const signOut = nextAuth.signOut

export async function getCurrentUser() {
    const session = await auth?.()
    return session?.user ?? null
}
