// lib/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { AuthUser, UserRole, TeacherRole } from "@/types"
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
import { USER_ROLES, TEACHER_ROLES, PERMISSIONS, ERROR_MESSAGES } from "./constants"

// ============================================================================
// TYPE GUARDS AND VALIDATION
// ============================================================================

function isValidUserRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole)
}

function isValidTeacherRole(role: string): role is TeacherRole {
  return Object.values(TEACHER_ROLES).includes(role as TeacherRole)
}

function createAuthUser(userData: {
  id: string
  email?: string
  role: string
  studentNumber?: string
  uuid?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  classId?: string
  courseId?: string
  teacherRole?: string
}): AuthUser | null {
  // Validate required fields
  if (!userData.id || !isValidUserRole(userData.role)) {
    return null
  }

  const baseUser: AuthUser = {
    id: userData.id,
    role: userData.role
  }

  // Add optional fields if they exist
  if (userData.email) baseUser.email = userData.email
  if (userData.studentNumber) baseUser.studentNumber = userData.studentNumber
  if (userData.uuid) baseUser.uuid = userData.uuid
  if (userData.firstName) baseUser.firstName = userData.firstName
  if (userData.lastName) baseUser.lastName = userData.lastName
  if (userData.phoneNumber) baseUser.phoneNumber = userData.phoneNumber
  if (userData.classId) baseUser.classId = userData.classId
  if (userData.courseId) baseUser.courseId = userData.courseId
  if (userData.teacherRole && isValidTeacherRole(userData.teacherRole)) {
    baseUser.teacherRole = userData.teacherRole
  }

  return baseUser
}

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
        console.warn('Invalid admin/teacher login credentials format')
        return null
      }

      const { email, password } = data

      // Check admin first
      const admin = await findAdminByEmail(email)
      if (admin) {
        const isValidPassword = await verifyPassword(password, admin.password)
        if (isValidPassword) {
          return createAuthUser({
            id: admin.id,
            email: admin.email,
            role: USER_ROLES.ADMIN
          })
        }
      }

      // Check teacher
      const teacher = await findTeacherByEmail(email)
      if (teacher) {
        const isValidPassword = await verifyPassword(password, teacher.password)
        if (isValidPassword) {
          return createAuthUser({
            id: teacher.id,
            email: teacher.email,
            role: USER_ROLES.TEACHER,
            teacherRole: teacher.role,
            courseId: teacher.courseId || teacher.headCourse?.id
          })
        }
      }

      console.warn('Admin/teacher authentication failed for email:', email)
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
        console.warn('Student authentication attempted without student number')
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
          return createAuthUser({
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
          })
        }
      }

      // Alternative method: Student Number + Email
      if (credentials.email) {
        const student = await findStudentByCredentials(
          studentNumber,
          undefined, // no phone
          credentials.email.trim().toLowerCase()
        )

        if (student) {
          return createAuthUser({
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
          })
        }
      }

      // Fallback method: Student Number + First Name + Last Name
      if (credentials.firstName && credentials.lastName) {
        // Find by student number only, then validate names
        const student = await findStudentByCredentials(studentNumber)

        if (student) {
          const firstNameMatch = student.firstName.toLowerCase() === credentials.firstName.trim().toLowerCase()
          const lastNameMatch = !student.lastName || 
            student.lastName.toLowerCase() === credentials.lastName.trim().toLowerCase()

          if (firstNameMatch && lastNameMatch) {
            return createAuthUser({
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
            })
          }
        }
      }

      console.warn('Student authentication failed for student number:', studentNumber)
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
        // Validate session data before updating token
        if (typeof session === 'object' && session !== null) {
          const sessionData = session as Record<string, unknown>
          
          // Only update specific allowed fields
          const allowedFields = ['email', 'firstName', 'lastName', 'phoneNumber'] as const
          
          for (const field of allowedFields) {
            if (field in sessionData && typeof sessionData[field] === 'string') {
              token[field] = sessionData[field]
            }
          }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        // Type-safe session construction
        const authUser: AuthUser = {
          id: typeof token.id === 'string' ? token.id : '',
          role: isValidUserRole(token.role as string) ? (token.role as UserRole) : USER_ROLES.STUDENT
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
        if (typeof token.teacherRole === 'string' && isValidTeacherRole(token.teacherRole)) {
          authUser.teacherRole = token.teacherRole
        }

        // Safely assign to session
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

    async signIn({ user, account, profile }) {
      // Additional validation can be added here
      if (!user || !user.id) {
        console.warn('Sign in rejected: invalid user data')
        return false
      }

      // Log successful authentication
      console.info('User authenticated:', {
        userId: user.id,
        role: (user as AuthUser).role,
        method: account?.provider
      })

      return true
    },

    async redirect({ url, baseUrl }) {
      // Handle redirects based on user role
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      
      // Default redirect
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
    },

    async session({ session, token }) {
      // Session validation can be added here
      if (!token?.id) {
        console.warn('Invalid session detected')
      }
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
  if (!user.id || !isValidUserRole(user.role)) {
    console.warn('Invalid user data in session')
    return null
  }

  return user
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  // Define permissions based on role
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
    throw new Error(ERROR_MESSAGES.AUTH.SESSION_EXPIRED)
  }
  
  if (allowedRoles) {
    const hasValidRole = await hasRole(allowedRoles)
    if (!hasValidRole) {
      throw new Error(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
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
    case USER_ROLES.ADMIN:
      return '/admin'
    case USER_ROLES.TEACHER:
      return '/teacher'
    case USER_ROLES.STUDENT:
      return '/student'
    default:
      return '/login'
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return await hasRole(USER_ROLES.ADMIN)
}

/**
 * Check if current user is teacher (any type)
 */
export async function isTeacher(): Promise<boolean> {
  return await hasRole(USER_ROLES.TEACHER)
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
  return await hasRole(USER_ROLES.STUDENT)
}
