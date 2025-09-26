// lib/auth.ts
import NextAuth from "next-auth"
import type { NextAuthConfig, User, Account, Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import type { ZodType } from "zod"
import type {
  AuthUser,
  LoginCredentials,
  UserRole,
  TeacherRole,
  StudentWithSessions,
  TeacherWithCourse,
  Admin
} from "@/types"
import { USER_ROLES } from "@/types"
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
import { PERMISSIONS } from "./constants"

// ============================================================================
// GENERIC INTERFACES (DRY PRINCIPLE)
// ============================================================================

interface ProviderAuthorizeParams {
  credentials?: Record<string, string>
}

interface AuthValidationResult<T> {
  isValid: boolean
  data?: T
  errors?: Record<string, string>
}

interface DatabaseAuthQueries {
  findAdmin: (email: string) => Promise<Admin | null>
  findTeacher: (email: string) => Promise<TeacherWithCourse | null>
  findStudent: (studentNumber: string, phone?: string, email?: string) => Promise<StudentWithSessions | null>
}

// ============================================================================
// AUTH CONFIGURATION CONSTANTS
// ============================================================================

const AUTH_CONFIG = {
  SESSION_MAX_AGE: 8 * 60 * 60, // 8 hours
  PAGES: {
    SIGN_IN: '/login',
    ERROR: '/login'
  },
  PROVIDERS: {
    ADMIN_TEACHER: 'credentials',
    STUDENT: 'student-auth'
  }
} as const

// ============================================================================
// AUTHENTICATION UTILITIES (DRY IMPLEMENTATION)
// ============================================================================

/**
 * Generic validation wrapper for auth inputs
 */
async function validateAuthInput<T>(
  schema: ZodType<T>,
  credentials: ProviderAuthorizeParams['credentials']
): Promise<AuthValidationResult<T>> {
  const validation: { isValid: boolean; data?: T; errors?: Record<string, string> } = validateForm(schema, credentials)
  return {
    isValid: validation.isValid,
    data: validation.data,
    errors: validation.errors
  }
}

/**
 * Generic password verification for admin/teacher
 */
async function verifyUserPassword(
  password: string,
  userHash: string
): Promise<boolean> {
  try {
    return await verifyPassword(password, userHash)
  } catch (error) {
    console.error('Password verification failed:', error)
    return false
  }
}

/**
 * Database query abstraction
 */
const authQueries: DatabaseAuthQueries = {
  findAdmin: findAdminByEmail,
  findTeacher: findTeacherByEmail,
  findStudent: findStudentByCredentials
}

// ============================================================================
// AUTH USER CREATION UTILITIES
// ============================================================================

/**
 * Create AuthUser from Admin record
 */
function createAdminAuthUser(admin: Admin): AuthUser {
  return {
    id: admin.id,
    email: admin.email,
    role: USER_ROLES.ADMIN
  }
}

/**
 * Create AuthUser from Teacher record
 */
function createTeacherAuthUser(teacher: TeacherWithCourse): AuthUser {
  return {
    id: teacher.id,
    email: teacher.email,
    role: USER_ROLES.TEACHER,
    teacherRole: teacher.role as TeacherRole,
    courseId: teacher.courseId || teacher.headCourse?.id
  }
}

/**
 * Create AuthUser from Student record
 */
function createStudentAuthUser(student: StudentWithSessions): AuthUser {
  return {
    id: student.id,
    role: USER_ROLES.STUDENT,
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
// AUTHENTICATION PROVIDERS
// ============================================================================

/**
 * Admin/Teacher Authentication Provider
 * Handles email + password authentication with role determination
 */
const adminTeacherProvider = CredentialsProvider({
  id: AUTH_CONFIG.PROVIDERS.ADMIN_TEACHER,
  name: "Admin/Teacher Login",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials: ProviderAuthorizeParams['credentials']): Promise<AuthUser | null> {
    try {
      // Validate input format
      const validation = await validateAuthInput(adminTeacherLoginSchema, credentials)
      if (!validation.isValid || !validation.data) {
        return null
      }

      const { email, password } = validation.data as LoginCredentials

      // Check admin first
      const admin = await authQueries.findAdmin(email!)
      if (admin) {
        const isValidPassword = await verifyUserPassword(password!, admin.password)
        if (isValidPassword) {
          return createAdminAuthUser(admin)
        }
      }

      // Check teacher if not admin
      const teacher = await authQueries.findTeacher(email!)
      if (teacher) {
        const isValidPassword = await verifyUserPassword(password!, teacher.password)
        if (isValidPassword) {
          return createTeacherAuthUser(teacher)
        }
      }

      return null
    } catch (error: unknown) {
      console.error('Admin/Teacher authentication error:', handlePrismaError(error))
      return null
    }
  }
})

/**
 * Student Authentication Provider
 * Handles UUID + student number with multiple verification fallbacks
 */
const studentProvider = CredentialsProvider({
  id: AUTH_CONFIG.PROVIDERS.STUDENT,
  name: "Student Authentication",
  credentials: {
    studentNumber: { label: "Student Number", type: "text" },
    phoneNumber: { label: "Phone Number", type: "tel" },
    email: { label: "Email", type: "email" },
    firstName: { label: "First Name", type: "text" },
    lastName: { label: "Last Name", type: "text" }
  },
  async authorize(credentials: ProviderAuthorizeParams['credentials']): Promise<AuthUser | null> {
    try {
      // Validate input format with studentLoginSchema
      const validation = await validateAuthInput(studentLoginSchema, credentials)
      if (!validation.isValid || !validation.data) {
        return null
      }

      const { studentNumber } = validation.data as LoginCredentials

      if (!studentNumber) {
        return null
      }

      const trimmedStudentNumber = studentNumber.trim().toUpperCase()

      // Primary method: Student Number + Phone Number
      if (credentials?.phoneNumber) {
        const student = await authQueries.findStudent(
          trimmedStudentNumber,
          credentials.phoneNumber.trim()
        )

        if (student) {
          return createStudentAuthUser(student)
        }
      }

      // Alternative method: Student Number + Email
      if (credentials?.email) {
        const student = await authQueries.findStudent(
          trimmedStudentNumber,
          undefined,
          credentials.email.trim().toLowerCase()
        )

        if (student) {
          return createStudentAuthUser(student)
        }
      }

      // Fallback method: Student Number + First Name + Last Name
      if (credentials?.firstName && credentials?.lastName) {
        const student = await authQueries.findStudent(trimmedStudentNumber)

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
// NEXTAUTH CONFIGURATION
// ============================================================================

const authConfig: NextAuthConfig = {
  providers: [adminTeacherProvider, studentProvider],
  pages: {
    signIn: AUTH_CONFIG.PAGES.SIGN_IN,
    error: AUTH_CONFIG.PAGES.ERROR
  },
  session: {
    strategy: 'jwt',
    maxAge: AUTH_CONFIG.SESSION_MAX_AGE
  },
  trustHost: true,
  callbacks: {
    async jwt({
      token,
      user,
      trigger,
      session
    }: {
      token: JWT;
      user?: User | AuthUser;
      trigger?: 'signIn' | 'signUp' | 'update';
      session?: Record<string, unknown>
    }): Promise<JWT> {
      // Initial sign in - populate token with user data
      if (user) {
        const authUser = user as AuthUser
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

      // Handle session updates (only when trigger === "update")
      if (trigger === "update" && session) {
        if (typeof session === 'object' && session !== null) {
          const sessionData = session as Record<string, unknown>

          // Only update specific allowed fields for security
          const allowedFields = ['email', 'firstName', 'lastName', 'phoneNumber'] as const

          for (const field of allowedFields) {
            if (field in sessionData && typeof sessionData[field] === 'string') {
              (token as JWT)[field as keyof JWT] = sessionData[field] as string
            }
          }
        }
      }

      return token
    },

    async session({ session, token }: { session: Session; token: JWT }) {
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

    async signIn({ user }: { user: User | AuthUser }) {
      return !!(user && user.id)
    },

    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user, account }: { user: User | AuthUser; account: Account | null }) {
      const authUser = user as AuthUser
      console.info('User signed in:', {
        userId: authUser.id,
        role: authUser.role,
        provider: account?.provider
      })
    },

    async signOut({ token }: { token?: JWT }) {
      console.info('User signed out:', {
        userId: token?.id,
        role: token?.role
      })
    }
  },
  debug: process.env.NODE_ENV === "development"
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

  switch (permission) {
    // Admin permissions
    case PERMISSIONS.CREATE_COURSE:
    case PERMISSIONS.MANAGE_SYSTEM:
    case PERMISSIONS.REMOVE_HEAD_TEACHER:
      return user.role === USER_ROLES.ADMIN

    // Head teacher permissions
    case PERMISSIONS.ADD_TEACHER:
    case PERMISSIONS.REMOVE_TEACHER:
    case PERMISSIONS.CREATE_CLASS:
      return user.role === USER_ROLES.TEACHER && user.teacherRole === 'HEAD'

    // All teacher permissions
    case PERMISSIONS.IMPORT_STUDENTS:
    case PERMISSIONS.SCAN_ATTENDANCE:
    case PERMISSIONS.CREATE_SESSION:
    case PERMISSIONS.APPROVE_REASSIGNMENT:
      return user.role === USER_ROLES.TEACHER

    // Student permissions
    case PERMISSIONS.GENERATE_QR:
    case PERMISSIONS.VIEW_OWN_ATTENDANCE:
    case PERMISSIONS.REQUEST_REASSIGNMENT:
      return user.role === USER_ROLES.STUDENT

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

// ============================================================================
// ROLE-BASED UTILITIES
// ============================================================================

/**
 * Get role-specific redirect path
 */
export function getRoleRedirectPath(role: UserRole): string {
  const redirectPaths = {
    [USER_ROLES.ADMIN]: '/admin',
    [USER_ROLES.TEACHER]: '/teacher',
    [USER_ROLES.STUDENT]: '/student'
  } as const

  return redirectPaths[role] || '/login'
}

/**
 * Role checking utilities
 */
export async function isAdmin(): Promise<boolean> {
  return await hasRole(USER_ROLES.ADMIN)
}

export async function isTeacher(): Promise<boolean> {
  return await hasRole(USER_ROLES.TEACHER)
}

export async function isHeadTeacher(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === USER_ROLES.TEACHER && user?.teacherRole === 'HEAD'
}

export async function isStudent(): Promise<boolean> {
  return await hasRole(USER_ROLES.STUDENT)
}
