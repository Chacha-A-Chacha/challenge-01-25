// lib/auth.ts

import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma, handlePrismaError } from "./db"
import { 
  adminTeacherLoginSchema, 
  studentLoginSchema,
  validateForm,
  type AdminTeacherLogin,
  type StudentLogin 
} from "./validations"
import { 
  verifyPassword,
  createApiResponse,
  handleApiError
} from "./utils"
import {
  AUTH_CONFIG,
  USER_ROLES,
  TEACHER_ROLES,
  STUDENT_AUTH_METHODS,
  ERROR_MESSAGES,
  PERMISSIONS
} from "./constants"
import type { AuthUser, UserRole, TeacherRole } from "@/types"

// ============================================================================
// NEXTAUTH TYPE EXTENSIONS
// ============================================================================

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

// ============================================================================
// AUTHENTICATION PROVIDERS
// ============================================================================

/**
 * Admin/Teacher authentication provider
 * Standard email + password authentication
 */
const adminTeacherProvider = CredentialsProvider({
  id: "admin-teacher",
  name: "Admin/Teacher Login",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    try {
      // Validate input format
      const { isValid, errors, data } = validateForm(adminTeacherLoginSchema, credentials)
      
      if (!isValid) {
        console.warn('Admin/Teacher login validation failed:', errors)
        return null
      }

      const { email, password } = data as AdminTeacherLogin

      // Check admin first
      const admin = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (admin) {
        const isValidPassword = await verifyPassword(password, admin.password)
        if (isValidPassword) {
          return {
            id: admin.id,
            email: admin.email,
            role: USER_ROLES.ADMIN,
            name: admin.email
          }
        }
      }

      // Check teacher if not admin
      const teacher = await prisma.teacher.findUnique({
        where: { email: email.toLowerCase() },
        include: { 
          course: true,
          headCourse: true
        }
      })

      if (teacher) {
        const isValidPassword = await verifyPassword(password, teacher.password)
        if (isValidPassword) {
          return {
            id: teacher.id,
            email: teacher.email,
            role: USER_ROLES.TEACHER,
            teacherRole: teacher.role,
            courseId: teacher.courseId || teacher.headCourse?.id,
            name: teacher.email
          }
        }
      }

      // Invalid credentials
      console.warn('Invalid admin/teacher credentials for:', email)
      return null

    } catch (error) {
      console.error('Admin/Teacher authentication error:', error)
      return null
    }
  }
})

/**
 * Student authentication provider
 * Multiple verification methods: Phone (primary), Email (alt), Name (fallback)
 */
const studentProvider = CredentialsProvider({
  id: "student",
  name: "Student Login",
  credentials: {
    studentNumber: { label: "Student Number", type: "text" },
    phoneNumber: { label: "Phone Number", type: "tel" },
    email: { label: "Email", type: "email" },
    firstName: { label: "First Name", type: "text" },
    lastName: { label: "Last Name", type: "text" }
  },
  async authorize(credentials) {
    try {
      // Validate input format
      const { isValid, errors, data } = validateForm(studentLoginSchema, credentials)
      
      if (!isValid) {
        console.warn('Student login validation failed:', errors)
        return null
      }

      const { studentNumber, phoneNumber, email, firstName, lastName } = data as StudentLogin

      // Find student by student number
      const student = await prisma.student.findFirst({
        where: { 
          studentNumber: studentNumber.toUpperCase()
        },
        include: { 
          class: { 
            include: { course: true } 
          },
          sessions: true
        }
      })

      if (!student) {
        console.warn('Student not found:', studentNumber)
        return null
      }

      // Verify using provided authentication method
      let isAuthenticated = false
      let authMethod = ''

      // Primary method: Student Number + Phone Number
      if (phoneNumber && student.phoneNumber) {
        const cleanInputPhone = phoneNumber.replace(/\s/g, '')
        const cleanStoredPhone = student.phoneNumber.replace(/\s/g, '')
        
        if (cleanInputPhone === cleanStoredPhone) {
          isAuthenticated = true
          authMethod = STUDENT_AUTH_METHODS.PRIMARY
        }
      }

      // Alternative method: Student Number + Email
      if (!isAuthenticated && email && student.email) {
        if (email.toLowerCase() === student.email.toLowerCase()) {
          isAuthenticated = true
          authMethod = STUDENT_AUTH_METHODS.ALTERNATIVE
        }
      }

      // Fallback method: Student Number + First Name + Last Name
      if (!isAuthenticated && firstName && lastName) {
        const inputFirstName = firstName.toLowerCase().trim()
        const inputLastName = lastName.toLowerCase().trim()
        const storedFirstName = student.firstName.toLowerCase().trim()
        const storedLastName = (student.lastName || '').toLowerCase().trim()

        if (inputFirstName === storedFirstName && inputLastName === storedLastName) {
          isAuthenticated = true
          authMethod = STUDENT_AUTH_METHODS.FALLBACK
        }
      }

      if (!isAuthenticated) {
        console.warn('Student authentication failed for:', studentNumber, 'Method attempted:', authMethod || 'none')
        return null
      }

      // Log successful authentication method for analytics
      console.info('Student authenticated:', studentNumber, 'Method:', authMethod)

      return {
        id: student.id,
        email: student.email,
        role: USER_ROLES.STUDENT,
        studentNumber: student.studentNumber,
        uuid: student.uuid,
        firstName: student.firstName,
        lastName: student.lastName,
        phoneNumber: student.phoneNumber,
        classId: student.classId,
        courseId: student.class.courseId,
        name: `${student.firstName} ${student.lastName || ''}`.trim()
      }

    } catch (error) {
      console.error('Student authentication error:', error)
      return null
    }
  }
})

// ============================================================================
// NEXTAUTH CONFIGURATION
// ============================================================================

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    adminTeacherProvider,
    studentProvider
  ],
  
  session: {
    strategy: "jwt",
    maxAge: AUTH_CONFIG.SESSION_DURATION / 1000, // Convert to seconds
    updateAge: AUTH_CONFIG.SESSION_EXTEND_THRESHOLD / 1000
  },
  
  pages: {
    signIn: "/login",
    error: "/auth/error"
  },
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.studentNumber = user.studentNumber
        token.uuid = user.uuid
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phoneNumber = user.phoneNumber
        token.classId = user.classId
        token.courseId = user.courseId
        token.teacherRole = user.teacherRole
      }

      // Handle session updates (like profile changes)
      if (trigger === "update" && session) {
        // Merge updated session data
        Object.assign(token, session)
      }

      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.id
      session.user.role = token.role
      session.user.studentNumber = token.studentNumber
      session.user.uuid = token.uuid
      session.user.firstName = token.firstName
      session.user.lastName = token.lastName
      session.user.phoneNumber = token.phoneNumber
      session.user.classId = token.classId
      session.user.courseId = token.courseId
      session.user.teacherRole = token.teacherRole

      return session
    },

    async signIn({ user, account, profile, email, credentials }) {
      // Additional sign-in validation if needed
      try {
        // Rate limiting could be implemented here
        // Account lockout logic could be added here
        return true
      } catch (error) {
        console.error('Sign-in callback error:', error)
        return false
      }
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.info('User signed in:', {
        userId: user.id,
        role: user.role,
        provider: account?.provider,
        isNewUser
      })
    },

    async signOut({ session, token }) {
      console.info('User signed out:', {
        userId: session?.user?.id || token?.id,
        role: session?.user?.role || token?.role
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
 * Get current session with type safety
 */
export async function getCurrentSession() {
  try {
    return await auth()
  } catch (error) {
    console.error('Error getting current session:', error)
    return null
  }
}

/**
 * Get current user with type safety
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession()
  return session?.user || null
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const permissions: Record<string, boolean> = {
    // Admin permissions
    [PERMISSIONS.CREATE_COURSE]: user.role === USER_ROLES.ADMIN,
    [PERMISSIONS.MANAGE_SYSTEM]: user.role === USER_ROLES.ADMIN,
    [PERMISSIONS.REMOVE_HEAD_TEACHER]: user.role === USER_ROLES.ADMIN,
    [PERMISSIONS.DECLARE_PROGRAM_END]: user.role === USER_ROLES.ADMIN,
    
    // Head teacher permissions
    [PERMISSIONS.ADD_TEACHER]: user.role === USER_ROLES.TEACHER && user.teacherRole === TEACHER_ROLES.HEAD,
    [PERMISSIONS.REMOVE_TEACHER]: user.role === USER_ROLES.TEACHER && user.teacherRole === TEACHER_ROLES.HEAD,
    [PERMISSIONS.CREATE_CLASS]: user.role === USER_ROLES.TEACHER && user.teacherRole === TEACHER_ROLES.HEAD,
    
    // All teacher permissions
    [PERMISSIONS.IMPORT_STUDENTS]: user.role === USER_ROLES.TEACHER,
    [PERMISSIONS.SCAN_ATTENDANCE]: user.role === USER_ROLES.TEACHER,
    [PERMISSIONS.CREATE_SESSION]: user.role === USER_ROLES.TEACHER,
    [PERMISSIONS.APPROVE_REASSIGNMENT]: user.role === USER_ROLES.TEACHER,
    [PERMISSIONS.VIEW_ATTENDANCE]: user.role === USER_ROLES.TEACHER,
    [PERMISSIONS.MODIFY_SESSION_TIMES]: user.role === USER_ROLES.TEACHER,
    [PERMISSIONS.MANUAL_ATTENDANCE]: user.role === USER_ROLES.TEACHER,
    
    // Student permissions
    [PERMISSIONS.GENERATE_QR]: user.role === USER_ROLES.STUDENT,
    [PERMISSIONS.VIEW_OWN_ATTENDANCE]: user.role === USER_ROLES.STUDENT,
    [PERMISSIONS.REQUEST_REASSIGNMENT]: user.role === USER_ROLES.STUDENT
  }

  return permissions[permission] || false
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
  }
  
  return user
}

/**
 * Require specific permission for API routes
 */
export async function requirePermission(permission: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
  }
  
  const hasAccess = await hasPermission(permission)
  
  if (!hasAccess) {
    throw new Error(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
  }
  
  return user
}

// ============================================================================
// ROLE-BASED ACCESS HELPERS
// ============================================================================

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === USER_ROLES.ADMIN
}

/**
 * Check if current user is teacher (any type)
 */
export async function isTeacher(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === USER_ROLES.TEACHER
}

/**
 * Check if current user is head teacher
 */
export async function isHeadTeacher(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === USER_ROLES.TEACHER && user?.teacherRole === TEACHER_ROLES.HEAD
}

/**
 * Check if current user is student
 */
export async function isStudent(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === USER_ROLES.STUDENT
}

/**
 * Get user's accessible courses
 */
export async function getAccessibleCourses() {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    if (user.role === USER_ROLES.ADMIN) {
      // Admin can access all courses
      return await prisma.course.findMany({
        include: {
          headTeacher: {
            select: { id: true, email: true }
          },
          _count: {
            select: { classes: true, teachers: true }
          }
        }
      })
    }
    
    if (user.role === USER_ROLES.TEACHER && user.courseId) {
      // Teachers can only access their assigned course
      const course = await prisma.course.findUnique({
        where: { id: user.courseId },
        include: {
          headTeacher: {
            select: { id: true, email: true }
          },
          classes: {
            include: {
              sessions: true,
              _count: { select: { students: true } }
            }
          },
          _count: {
            select: { teachers: true }
          }
        }
      })
      
      return course ? [course] : []
    }
    
    if (user.role === USER_ROLES.STUDENT && user.courseId) {
      // Students can view basic info about their course
      const course = await prisma.course.findUnique({
        where: { id: user.courseId },
        select: {
          id: true,
          name: true,
          status: true
        }
      })
      
      return course ? [course] : []
    }
    
    return []
  } catch (error) {
    console.error('Error getting accessible courses:', error)
    return []
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Extend user session
 */
export async function extendSession() {
  const session = await getCurrentSession()
  if (!session) return false

  try {
    // This would trigger the JWT callback to refresh the session
    await signIn('credentials', { 
      redirect: false,
      callbackUrl: '/' 
    })
    return true
  } catch (error) {
    console.error('Error extending session:', error)
    return false
  }
}

/**
 * Check if session is expired
 */
export async function isSessionExpired(): Promise<boolean> {
  const session = await getCurrentSession()
  if (!session) return true

  // Session expiry is handled by NextAuth automatically
  // This function exists for explicit checks if needed
  return false
}

/**
 * Update user profile in session
 */
export async function updateSessionProfile(updates: Partial<AuthUser>) {
  try {
    // This would update the session with new profile data
    // Implementation depends on how you want to handle profile updates
    return true
  } catch (error) {
    console.error('Error updating session profile:', error)
    return false
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE HELPERS
// ============================================================================

/**
 * Middleware helper for route protection
 */
export function createAuthMiddleware(allowedRoles?: UserRole[]) {
  return async (request: Request) => {
    try {
      const user = await requireAuth(allowedRoles)
      return { user, authorized: true }
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
 * API route authentication wrapper
 */
export function withAuth<T extends any[]>(
  handler: (user: AuthUser, ...args: T) => Promise<Response>,
  allowedRoles?: UserRole[]
) {
  return async (...args: T): Promise<Response> => {
    try {
      const user = await requireAuth(allowedRoles)
      return await handler(user, ...args)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      const response = createApiResponse(false, undefined, undefined, errorMessage)
      
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

/**
 * Permission-based API route wrapper
 */
export function withPermission<T extends any[]>(
  handler: (user: AuthUser, ...args: T) => Promise<Response>,
  permission: string
) {
  return async (...args: T): Promise<Response> => {
    try {
      const user = await requirePermission(permission)
      return await handler(user, ...args)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission denied'
      const response = createApiResponse(false, undefined, undefined, errorMessage)
      
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Create test user for development
 * Only available in development environment
 */
export async function createTestUser(role: UserRole, overrides: Partial<AuthUser> = {}) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test user creation only available in development')
  }

  const { hashPassword } = await import('./utils')

  try {
    const defaultPassword = await hashPassword('test123456')

    switch (role) {
      case USER_ROLES.ADMIN:
        return await prisma.admin.create({
          data: {
            email: overrides.email || 'admin@test.com',
            password: defaultPassword
          }
        })

      case USER_ROLES.TEACHER:
        // First create a course for the teacher
        const course = await prisma.course.create({
          data: {
            name: 'Test Course',
            headTeacher: {
              create: {
                email: overrides.email || 'teacher@test.com',
                password: defaultPassword,
                role: TEACHER_ROLES.HEAD
              }
            }
          }
        })
        return course.headTeacher

      case USER_ROLES.STUDENT:
        // Create a test class first
        const testClass = await prisma.class.findFirst() || await prisma.class.create({
          data: {
            name: 'Test Class',
            capacity: 25,
            courseId: (await prisma.course.findFirst())?.id || 'test-course-id'
          }
        })

        return await prisma.student.create({
          data: {
            studentNumber: overrides.studentNumber || 'TEST001',
            firstName: overrides.firstName || 'Test',
            lastName: overrides.lastName || 'Student',
            email: overrides.email || 'student@test.com',
            phoneNumber: overrides.phoneNumber || '+1234567890',
            classId: testClass.id
          }
        })

      default:
        throw new Error('Invalid user role')
    }
  } catch (error) {
    console.error('Error creating test user:', error)
    throw error
  }
}

// Export the auth instance as default
export default { handlers, auth, signIn, signOut }
