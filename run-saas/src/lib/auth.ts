// src/lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import {prisma} from "@/lib/db"
import bcrypt from "bcryptjs"
import type {UserRole, TeacherRole} from "@/types/enums" // uses your enums file

// Shape we put into JWT on successful authorize()
interface AuthUserReturn {
    id: string
    role: UserRole
    email?: string
    // student extras
    studentNumber?: string
    uuid?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    classId?: string
    courseId?: string
    // teacher extras
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

                // Teacher (+ include relations for course/headCourse)
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
                        // prefer direct courseId, else headCourse.id if they’re a head teacher
                        courseId: (teacher as any).courseId ?? teacher.headCourse?.id
                    }
                }

                return null
            }
        }),

        // Student (primary: phone; alternatives: email; fallback: first+last name)
        Credentials({
            id: "student",
            name: "Student Login",
            credentials: {
                studentNumber: {label: "Student Number", type: "text"},
                phoneNumber: {label: "Phone Number", type: "tel"},
                email: {label: "Email", type: "email"},
                firstName: {label: "First Name", type: "text"},
                lastName: {label: "Last Name", type: "text"},
            },
            async authorize(credentials): Promise<AuthUserReturn | null> {
                const studentNumber = credentials?.studentNumber?.toUpperCase().trim()
                if (!studentNumber) return null

                const student = await prisma.student.findFirst({
                    where: {studentNumber},
                    include: {class: {include: {course: true}}}
                })
                if (!student) return null

                // Primary: phone
                if (credentials?.phoneNumber && student.phoneNumber === credentials.phoneNumber) {
                    return {
                        id: student.id,
                        role: "student" as UserRole,
                        studentNumber: student.studentNumber,
                        uuid: student.uuid ?? undefined,
                        firstName: student.firstName,
                        lastName: student.lastName ?? undefined,
                        email: student.email ?? undefined,
                        phoneNumber: student.phoneNumber ?? undefined,
                        classId: student.classId ?? undefined,
                        courseId: student.class?.course?.id ?? undefined,
                    }
                }

                // Alternative: email
                if (credentials?.email) {
                    const email = credentials.email.toLowerCase().trim()
                    if (student.email && student.email.toLowerCase().trim() === email) {
                        return {
                            id: student.id,
                            role: "student" as UserRole,
                            studentNumber: student.studentNumber,
                            uuid: student.uuid ?? undefined,
                            firstName: student.firstName,
                            lastName: student.lastName ?? undefined,
                            email: student.email ?? undefined,
                            phoneNumber: student.phoneNumber ?? undefined,
                            classId: student.classId ?? undefined,
                            courseId: student.class?.course?.id ?? undefined,
                        }
                    }
                }

                // Fallback: name match (lastName may be missing on record; handle that)
                if (credentials?.firstName && credentials?.lastName) {
                    const firstOk = student.firstName.toLowerCase().trim() === credentials.firstName.toLowerCase().trim()
                    const lastOk = !student.lastName || student.lastName.toLowerCase().trim() === credentials.lastName.toLowerCase().trim()
                    if (firstOk && lastOk) {
                        return {
                            id: student.id,
                            role: "student" as UserRole,
                            studentNumber: student.studentNumber,
                            uuid: student.uuid ?? undefined,
                            firstName: student.firstName,
                            lastName: student.lastName ?? undefined,
                            email: student.email ?? undefined,
                            phoneNumber: student.phoneNumber ?? undefined,
                            classId: student.classId ?? undefined,
                            courseId: student.class?.course?.id ?? undefined,
                        }
                    }
                }

                return null
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
            // On first sign-in, seed JWT with our fields
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

            // Allow session.update() to push changes into token if you ever call it
            if (trigger === "update" && session) {
                Object.assign(token, session)
            }

            return token
        },

        async session({session, token}) {
            // expose our enriched fields to session.user
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
                } as any
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

// Server-side helper
export async function getCurrentUser() {
    const session = await auth?.()
    return session?.user ?? null
}
