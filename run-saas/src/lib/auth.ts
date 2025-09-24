// lib/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type {
  AuthUser,
  UserRole,
  TeacherRole,
  StudentWithSessions,
  TeacherWithCourse
} from "@/types"
import {
  findAdminByEmail,
  findTeacherByEmail,
  findStudentByCredentials,
  handlePrismaError
} from "./db"
import { verifyPassword } from "./utils"
import {
  adminTeacherLoginSchema,
  studentLoginSchema,
  validateForm
} from "./validations"

// ============================================================================
// AUTHENTICATION PROVIDERS
// ============================================================================

const adminTeacherProvider = CredentialsProvider({
  id: "credentials",
  name: "Admin/Teacher Login",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    try {
      // Validate input format
      const { isValid, data } = validateForm(adminTeacherLoginSchema, credentials)

      if (!isValid || !data) {
        return null
      }

      const { email, password } = data

      // Check admin first
      const admin = await findAdminByEmail(email)
      if (admin) {
        const isValidPassword = await verifyPassword(password, admin.password)
        if (isValidPassword) {
          return {
            id: admin.id,
            email: admin.email,
            role: "admin" as UserRole
          }
        }
      }

      // Check teacher
      const teacher = await findTeacherByEmail(email)
      if (teacher) {
        const isValidPassword = await verifyPassword(password, teacher.password)
        if (isValidPassword) {
          return {
            id: teacher.id,
            email: teacher.email,
            role: "teacher" as UserRole,
            teacherRole: teacher.role as TeacherRole,
            courseId: teacher.courseId || teacher.headCourse?.id
          }
        }
      }

      return null
    } catch (error: unknown) {
      console.error('Admin/Teacher authentication error:', handlePrismaError(error))
      return null
    }
  }
})

const studentProvider = CredentialsProvider({
  id: "student-auth",
  name: "Student Authentication",
  credentials: {
    studentNumber: { label: "Student Number", type: "text" },
    phoneNumber: { label: "Phone Number", type: "tel" },
    email: { label: "Email", type: "email" },
    firstName: { label: "First Name", type: "text" },
    lastName: { label: "Last Name", type: "text" }
  },
  async authorize(credentials) {
    try {
      if (!credentials?.studentNumber) {
        return null
      }

      const studentNumber = credentials.studentNumber.trim().toUpperCase()

      // Primary method: Student Number + Phone Number
      if (credentials.phoneNumber) {
        const student = await findStudentByCredentials(
          studentNumber,
          credentials.phoneNumber.trim()
        )

        if (student) {
          return createStudentAuthUser(student)
        }
      }

      // Alternative method: Student Number + Email
      if (credentials.email) {
        const student = await findStudentByCredentials(
          studentNumber,
          undefined,
          credentials.email.trim().toLowerCase()
        )

        if (student) {
          return createStudentAuthUser(student)
        }
      }

      // Fallback method: Student Number + First Name + Last Name
      if (credentials.firstName && credentials.lastName) {
        const student = await findStudentByCredentials(studentNumber)

        if (student) {
          const firstNameMatch = student.firstName.toLowerCase() === credentials.firstName.trim().toLowerCase()
          const lastNameMatch = !student.lastName ||
            student.lastName.toLowerCase() === credentials.lastName.trim().toLowerCase()

          if (firstNameMatch && lastNameMatch) {
            return createStudentAuthUser(student)
          }
        }
      }

      return null
    } catch (error: unknown) {
      console.error('Student authentication error:', handlePrismaError(error))
      return null
    }
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createStudentAuthUser(student: StudentWithSessions): AuthUser {
  return {
    id: student.id,
    role: "student" as UserRole,
    studentNumber: student.studentNumber,
    uuid: student.uuid,
    firstName: student.firstName,
    lastName: student.lastName || undefined,
    phoneNumber: student.phoneNumber || undefined,
    email: student.email,
    classId: student.classId,
    courseId: student.class?.course?.id
  }
}

// ============================================================================
// NEXTAUTH CONFIGURATION
// ============================================================================

const authConfig: NextAuthConfig = {
  providers: [adminTeacherProvider, studentProvider],
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60 // 8 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        const authUser = user as AuthUser
        token.id = authUser.id
        token.role = authUser.role
        token.email = authUser.email
        token.studentNumber = authUser.studentNumber
        token.uuid = authUser.uuid
        token.firstName = authUser.firstName
        token.lastName = authUser.lastName
        token.phoneNumber = authUser.phoneNumber
        token.classId = authUser.classId
        token.courseId = authUser.courseId
        token.teacherRole = authUser.teacherRole
      }

      // Handle session updates
      if (trigger === "update" && session) {
        if (typeof session === 'object' && session !== null) {
          const sessionData = session as Record<string, unknown>

          const allowedFields = ['email', 'firstName', 'lastName', 'phoneNumber'] as const

          for (const field of allowedFields) {
            if (field in sessionData && typeof sessionData[field] === 'string') {
              token[field] = sessionData[field] as string
            }
          }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && token.id && token.role) {
        const authUser: AuthUser = {
          id: token.id as string,
          role: token.role as UserRole
        }

        // Add optional fields with type checking
        if (typeof token.email === 'string') authUser.email = token.email
        if (typeof token.studentNumber === 'string') authUser.studentNumber = token.studentNumber
        if (typeof token.uuid === 'string') authUser.uuid = token.uuid
        if (typeof token.firstName === 'string') authUser.firstName = token.firstName
        if (typeof token.lastName === 'string') authUser.lastName = token.lastName
        if (typeof token.phoneNumber === 'string') authUser.phoneNumber = token.phoneNumber
        if (typeof token.classId === 'string') authUser.classId = token.classId
        if (typeof token.courseId === 'string') authUser.courseId = token.courseId
        if (typeof token.teacherRole === 'string') authUser.teacherRole = token.teacherRole as TeacherRole

        session.user = {
          ...session.user,
          ...authUser,
          name: authUser.firstName && authUser.lastName
            ? `${authUser.firstName} ${authUser.lastName}`
            : authUser.email || authUser.studentNumber || 'User'
        }
      }

      return session
    },

    async signIn({ user }) {
      if (!user || !user.id) {
        return false
      }

      return true
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url

      return baseUrl
    }
  },
  events: {
    async signIn({ user, account }) {
      const authUser = user as AuthUser
      console.info('User signed in:', {
        userId: authUser.id,
        role: authUser.role,
        provider: account?.provider
      })
    },

    async signOut({ token }) {
      console.info('User signed out:', {
        userId: token?.id,
        role: token?.role
      })
    }
  },
  debug: process.env.NODE_ENV === "development",
  trustHost: true
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

/**
 * Get current session with proper error handling
 */
export async function getCurrentSession() {
  try {
    return await auth()
  } catch (error: unknown) {
    console.error('Error getting current session:', handlePrismaError(error))
    return null
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession()

  if (!session?.user) {
    return null
  }

  const user = session.user as AuthUser

  // Validate user has required fields
  if (!user.id || !user.role) {
    return null
  }

  return user
}

/**
 * Check if user has specific permission based on role
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  // Simple role-based permissions
  switch (permission) {
    // Admin permissions
    case 'create_course':
    case 'manage_system':
    case 'remove_head_teacher':
      return user.role === 'admin'

    // Head teacher permissions
    case 'add_teacher':
    case 'remove_teacher':
    case 'create_class':
      return user.role === 'teacher' && user.teacherRole === 'HEAD'

    // All teacher permissions
    case 'import_students':
    case 'scan_attendance':
    case 'create_session':
    case 'approve_reassignment':
      return user.role === 'teacher'

    // Student permissions
    case 'generate_qr':
    case 'view_own_attendance':
    case 'request_reassignment':
      return user.role === 'student'

    default:
      return false
  }
}

/**
 * Check if user has any of the provided roles
 */
export async function hasRole(allowedRoles: UserRole | UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return roles.includes(user.role)
}

/**
 * Require authentication with optional role checking
 */
export async function requireAuth(allowedRoles?: UserRole | UserRole[]): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  if (allowedRoles) {
    const hasValidRole = await hasRole(allowedRoles)
    if (!hasValidRole) {
      throw new Error('Insufficient permissions')
    }
  }

  return user
}

/**
 * Create authentication middleware for API routes
 */
export function createAuthMiddleware(allowedRoles?: UserRole | UserRole[]) {
  return async () => {
    try {
      const user = await requireAuth(allowedRoles)
      return { user, authorized: true, error: null }
    } catch (error) {
      return {
        user: null,
        authorized: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }
    }
  }
}

/**
 * Get role-specific redirect path
 */
export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'teacher':
      return '/teacher'
    case 'student':
      return '/student'
    default:
      return '/login'
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return await hasRole('admin')
}

/**
 * Check if current user is teacher (any type)
 */
export async function isTeacher(): Promise<boolean> {
  return await hasRole('teacher')
}

/**
 * Check if current user is head teacher
 */
export async function isHeadTeacher(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'teacher' && user?.teacherRole === 'HEAD'
}

/**
 * Check if current user is student
 */
export async function isStudent(): Promise<boolean> {
  return await hasRole('student')
}
