// lib/auth.ts
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import type { UserRole, TeacherRole } from "@/types"

// Type-safe user return from providers
interface AuthUserReturn {
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

const config: NextAuthConfig = {
  providers: [
    // Admin + Teacher credential provider
    CredentialsProvider({
      id: "admin-teacher",
      name: "Admin/Teacher Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<AuthUserReturn | null> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).toLowerCase().trim()
        const password = credentials.password as string

        // Check Admin
        const admin = await prisma.admin.findUnique({
          where: { email }
        })

        if (admin && await bcrypt.compare(password, admin.password)) {
          return {
            id: admin.id,
            email: admin.email,
            role: "admin"
          }
        }

        // Check Teacher
        const teacher = await prisma.teacher.findUnique({
          where: { email },
          include: {
            course: true,
            headCourse: true
          }
        })

        if (teacher && await bcrypt.compare(password, teacher.password)) {
          return {
            id: teacher.id,
            email: teacher.email,
            role: "teacher",
            teacherRole: teacher.role,
            courseId: teacher.courseId || teacher.headCourse?.id
          }
        }

        return null
      }
    }),

    // Student credential provider
    CredentialsProvider({
      id: "student",
      name: "Student Login",
      credentials: {
        studentNumber: { label: "Student Number", type: "text" },
        phoneNumber: { label: "Phone Number", type: "tel" },
        email: { label: "Email", type: "email" },
        firstName: { label: "First Name", type: "text" },
        lastName: { label: "Last Name", type: "text" }
      },
      async authorize(credentials): Promise<AuthUserReturn | null> {
        if (!credentials?.studentNumber) {
          return null
        }

        const studentNumber = (credentials.studentNumber as string).toUpperCase().trim()

        const student = await prisma.student.findFirst({
          where: { studentNumber },
          include: {
            class: {
              include: { course: true }
            }
          }
        })

        if (!student) {
          return null
        }

        // Verify with phone number (primary)
        if (credentials.phoneNumber && student.phoneNumber === credentials.phoneNumber) {
          return {
            id: student.id,
            role: "student",
            studentNumber: student.studentNumber,
            uuid: student.uuid,
            firstName: student.firstName,
            lastName: student.lastName || undefined,
            email: student.email,
            phoneNumber: student.phoneNumber || undefined,
            classId: student.classId,
            courseId: student.class?.course?.id
          }
        }

        // Verify with email (alternative)
        if (credentials.email && student.email === (credentials.email as string).toLowerCase().trim()) {
          return {
            id: student.id,
            role: "student",
            studentNumber: student.studentNumber,
            uuid: student.uuid,
            firstName: student.firstName,
            lastName: student.lastName || undefined,
            email: student.email,
            phoneNumber: student.phoneNumber || undefined,
            classId: student.classId,
            courseId: student.class?.course?.id
          }
        }

        // Verify with name (fallback)
        if (credentials.firstName && credentials.lastName) {
          const firstNameMatch = student.firstName.toLowerCase() === (credentials.firstName as string).toLowerCase().trim()
          const lastNameMatch = !student.lastName ||
            student.lastName.toLowerCase() === (credentials.lastName as string).toLowerCase().trim()

          if (firstNameMatch && lastNameMatch) {
            return {
              id: student.id,
              role: "student",
              studentNumber: student.studentNumber,
              uuid: student.uuid,
              firstName: student.firstName,
              lastName: student.lastName || undefined,
              email: student.email,
              phoneNumber: student.phoneNumber || undefined,
              classId: student.classId,
              courseId: student.class?.course?.id
            }
          }
        }

        return null
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60 // 8 hours
  },

  pages: {
    signIn: "/login",
    error: "/login"
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        const authUser = user as AuthUserReturn
        return {
          ...token,
          id: authUser.id,
          role: authUser.role,
          email: authUser.email,
          studentNumber: authUser.studentNumber,
          uuid: authUser.uuid,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          phoneNumber: authUser.phoneNumber,
          classId: authUser.classId,
          courseId: authUser.courseId,
          teacherRole: authUser.teacherRole
        }
      }

      // Handle session updates
      if (trigger === "update" && session) {
        return { ...token, ...session }
      }

      return token
    },

    async session({ session, token }) {
      if (token && token.id && token.role) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as UserRole,
          email: token.email as string | undefined,
          studentNumber: token.studentNumber as string | undefined,
          uuid: token.uuid as string | undefined,
          firstName: token.firstName as string | undefined,
          lastName: token.lastName as string | undefined,
          phoneNumber: token.phoneNumber as string | undefined,
          classId: token.classId as string | undefined,
          courseId: token.courseId as string | undefined,
          teacherRole: token.teacherRole as TeacherRole | undefined
        }
      }

      return session
    }
  },

  debug: process.env.NODE_ENV === "development"
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)

// Helper to get current user server-side
export async function getCurrentUser() {
  const session = await auth()
  return session?.user || null
}
