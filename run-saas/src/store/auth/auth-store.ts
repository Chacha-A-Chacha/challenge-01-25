// store/auth/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSession, signIn, signOut } from 'next-auth/react'
import type { 
  AuthUser, 
  UserRole, 
  TeacherRole,
  StudentLoginData,
  AdminTeacherLoginData,
  BaseStoreState
} from '@/types'
import { 
  USER_ROLES,
  TEACHER_ROLES,
  PERMISSIONS,
  ERROR_MESSAGES,
  BUSINESS_RULES
} from '@/lib/constants'
import { 
  getCurrentUser,
  hasPermission,
  hasRole,
  isAdmin,
  isTeacher,
  isHeadTeacher,
  isStudent,
  getRoleRedirectPath
} from '@/lib/auth'
import {
  validateForm,
  adminTeacherLoginSchema,
  studentLoginSchema
} from '@/lib/validations'
import {
  sanitizeInput,
  createApiResponse,
  isValidEmail
} from '@/lib/utils'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthState extends BaseStoreState {
  // User state
  user: AuthUser | null
  isAuthenticated: boolean
  
  // Session state  
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'
  lastActivity: Date | null
  
  // Authentication flow state
  isLoggingIn: boolean
  isLoggingOut: boolean
  loginError: string | null
  
  // Login form state
  loginData: {
    adminTeacher: AdminTeacherLoginData
    student: StudentLoginData
  }
  loginMode: 'admin-teacher' | 'student'
  
  // Permission cache (for performance)
  permissions: Record<string, boolean>
  lastPermissionCheck: Date | null
  
  // Actions - Authentication Flow
  login: (credentials: AdminTeacherLoginData | StudentLoginData, mode: 'admin-teacher' | 'student') => Promise<boolean>
  logout: () => Promise<void>
  syncWithNextAuth: (sessionData: any) => void
  refreshSession: () => Promise<void>
  
  // Actions - User Management
  updateProfile: (updates: Partial<AuthUser>) => Promise<boolean>
  updateLastActivity: () => void
  
  // Actions - Login Form Management
  setLoginMode: (mode: 'admin-teacher' | 'student') => void
  updateLoginData: (data: Partial<AdminTeacherLoginData> | Partial<StudentLoginData>) => void
  clearLoginData: () => void
  validateLoginData: () => { isValid: boolean; errors: Record<string, string> }
  
  // Actions - Permission Management
  checkPermission: (permission: string) => Promise<boolean>
  refreshPermissions: () => Promise<void>
  clearPermissionCache: () => void
  
  // Getters - User Information
  getCurrentUser: () => AuthUser | null
  getUserId: () => string | null
  getUserRole: () => UserRole | null
  getUserEmail: () => string | null
  getUserName: () => string | null
  
  // Getters - Role Checks
  isAdmin: () => boolean
  isTeacher: () => boolean
  isHeadTeacher: () => boolean
  isStudent: () => boolean
  hasRole: (roles: UserRole | UserRole[]) => boolean
  
  // Getters - Permission Checks (cached)
  canCreateCourse: () => boolean
  canManageSystem: () => boolean
  canRemoveHeadTeacher: () => boolean
  canAddTeacher: () => boolean
  canRemoveTeacher: () => boolean
  canCreateClass: () => boolean
  canImportStudents: () => boolean
  canScanAttendance: () => boolean
  canCreateSession: () => boolean
  canApproveReassignment: () => boolean
  canViewAttendance: () => boolean
  canModifySessionTimes: () => boolean
  canManualAttendance: () => boolean
  canGenerateQR: () => boolean
  canViewOwnAttendance: () => boolean
  canRequestReassignment: () => boolean
  
  // Getters - Business Logic
  getRedirectPath: () => string
  getSessionTimeLeft: () => number
  isSessionExpired: () => boolean
  needsPasswordChange: () => boolean
  getRemainingReassignmentRequests: () => number
  
  // Utility Actions
  clearErrors: () => void
  resetState: () => void
  exportUserData: () => any
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialLoginData = {
  adminTeacher: {
    email: '',
    password: ''
  },
  student: {
    studentNumber: '',
    phoneNumber: '',
    email: '',
    firstName: '',
    lastName: ''
  }
}

// ============================================================================
// AUTH STORE IMPLEMENTATION
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      user: null,
      isAuthenticated: false,
      sessionStatus: 'loading',
      lastActivity: null,
      
      isLoggingIn: false,
      isLoggingOut: false,
      loginError: null,
      
      loginData: initialLoginData,
      loginMode: 'admin-teacher',
      
      permissions: {},
      lastPermissionCheck: null,
      
      // ============================================================================
      // AUTHENTICATION FLOW ACTIONS
      // ============================================================================
      
      login: async (credentials, mode) => {
        set({ 
          isLoggingIn: true, 
          loginError: null,
          isLoading: true 
        })
        
        try {
          // Validate credentials based on mode
          const validation = get().validateLoginData()
          if (!validation.isValid) {
            const firstError = Object.values(validation.errors)[0]
            throw new Error(firstError)
          }
          
          // Use NextAuth signIn with appropriate provider
          const providerId = mode === 'admin-teacher' ? 'credentials' : 'student-auth'
          
          const result = await signIn(providerId, {
            ...credentials,
            redirect: false
          })
          
          if (result?.error) {
            throw new Error(result.error === 'CredentialsSignin' 
              ? ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS 
              : result.error)
          }
          
          if (result?.ok) {
            // Clear login data on successful authentication
            get().clearLoginData()
            
            set({ 
              isLoggingIn: false,
              isLoading: false,
              loginError: null,
              lastActivity: new Date()
            })
            
            // Refresh session to get user data
            await get().refreshSession()
            
            return true
          } else {
            throw new Error(ERROR_MESSAGES.AUTH.LOGIN_FAILED)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.AUTH.LOGIN_FAILED
          
          set({ 
            loginError: errorMessage,
            isLoggingIn: false,
            isLoading: false
          })
          
          console.error('Login failed:', error)
          return false
        }
      },
      
      logout: async () => {
        set({ isLoggingOut: true })
        
        try {
          await signOut({ redirect: false })
          
          // Clear all auth state
          set({
            user: null,
            isAuthenticated: false,
            sessionStatus: 'unauthenticated',
            lastActivity: null,
            isLoggingOut: false,
            permissions: {},
            lastPermissionCheck: null,
            loginData: initialLoginData,
            loginError: null
          })
        } catch (error) {
          console.error('Logout failed:', error)
          set({ isLoggingOut: false })
        }
      },
      
      syncWithNextAuth: (sessionData) => {
        if (sessionData?.user) {
          const user = sessionData.user as AuthUser
          
          // Validate user data structure
          if (!user.id || !user.role) {
            console.warn('Invalid session data received')
            return
          }
          
          set({
            user,
            isAuthenticated: true,
            sessionStatus: 'authenticated',
            lastActivity: new Date(),
            isLoading: false
          })
          
          // Clear permission cache when user changes
          if (get().user?.id !== user.id) {
            get().clearPermissionCache()
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            sessionStatus: 'unauthenticated',
            isLoading: false,
            permissions: {},
            lastPermissionCheck: null
          })
        }
      },
      
      refreshSession: async () => {
        try {
          const user = await getCurrentUser()
          
          if (user) {
            set({
              user,
              isAuthenticated: true,
              sessionStatus: 'authenticated',
              lastActivity: new Date(),
              lastUpdated: new Date()
            })
          } else {
            set({
              user: null,
              isAuthenticated: false,
              sessionStatus: 'unauthenticated'
            })
          }
        } catch (error) {
          console.error('Failed to refresh session:', error)
          set({
            user: null,
            isAuthenticated: false,
            sessionStatus: 'unauthenticated'
          })
        }
      },
      
      // ============================================================================
      // USER MANAGEMENT ACTIONS
      // ============================================================================
      
      updateProfile: async (updates) => {
        const currentUser = get().user
        if (!currentUser) {
          set({ error: ERROR_MESSAGES.AUTH.SESSION_EXPIRED })
          return false
        }
        
        try {
          set({ isLoading: true, error: null })
          
          // Update via NextAuth
          // Note: This would typically involve an API call to update the user
          const response = await fetch('/api/auth/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })
          
          if (!response.ok) {
            throw new Error('Failed to update profile')
          }
          
          const updatedUser = { ...currentUser, ...updates }
          
          set({
            user: updatedUser,
            isLoading: false,
            lastUpdated: new Date()
          })
          
          return true
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
          set({ 
            error: errorMessage,
            isLoading: false
          })
          return false
        }
      },
      
      updateLastActivity: () => {
        set({ lastActivity: new Date() })
      },
      
      // ============================================================================
      // LOGIN FORM MANAGEMENT
      // ============================================================================
      
      setLoginMode: (mode) => {
        set({ 
          loginMode: mode,
          loginError: null 
        })
        get().clearLoginData()
      },
      
      updateLoginData: (data) => {
        const currentMode = get().loginMode
        
        set((state) => ({
          loginData: {
            ...state.loginData,
            [currentMode]: {
              ...state.loginData[currentMode],
              ...data
            }
          },
          loginError: null
        }))
      },
      
      clearLoginData: () => {
        set({ 
          loginData: initialLoginData,
          loginError: null 
        })
      },
      
      validateLoginData: () => {
        const { loginData, loginMode } = get()
        const currentData = loginData[loginMode]
        
        if (loginMode === 'admin-teacher') {
          const validation = validateForm(adminTeacherLoginSchema, currentData)
          return {
            isValid: validation.isValid,
            errors: validation.isValid ? {} : { general: 'Please enter valid email and password' }
          }
        } else {
          const validation = validateForm(studentLoginSchema, currentData)
          const errors: Record<string, string> = {}
          
          if (!validation.isValid) {
            if (!currentData.studentNumber) {
              errors.studentNumber = 'Student number is required'
            }
            
            // Check if at least one authentication method is provided
            const hasPhone = !!currentData.phoneNumber
            const hasEmail = !!currentData.email
            const hasName = !!(currentData.firstName && currentData.lastName)
            
            if (!hasPhone && !hasEmail && !hasName) {
              errors.general = 'Please provide phone number, email, or first & last name'
            }
          }
          
          return {
            isValid: Object.keys(errors).length === 0,
            errors
          }
        }
      },
      
      // ============================================================================
      // PERMISSION MANAGEMENT
      // ============================================================================
      
      checkPermission: async (permission) => {
        const { permissions, lastPermissionCheck } = get()
        const now = new Date()
        
        // Use cached permission if recent (1 minute cache)
        if (lastPermissionCheck && 
            (now.getTime() - lastPermissionCheck.getTime()) < 60000 &&
            permission in permissions) {
          return permissions[permission]
        }
        
        try {
          const hasPerms = await hasPermission(permission)
          
          set((state) => ({
            permissions: {
              ...state.permissions,
              [permission]: hasPerms
            },
            lastPermissionCheck: now
          }))
          
          return hasPerms
        } catch (error) {
          console.error('Failed to check permission:', error)
          return false
        }
      },
      
      refreshPermissions: async () => {
        const allPermissions = Object.values(PERMISSIONS)
        const permissionResults: Record<string, boolean> = {}
        
        for (const permission of allPermissions) {
          try {
            permissionResults[permission] = await hasPermission(permission)
          } catch (error) {
            console.error(`Failed to check permission ${permission}:`, error)
            permissionResults[permission] = false
          }
        }
        
        set({
          permissions: permissionResults,
          lastPermissionCheck: new Date()
        })
      },
      
      clearPermissionCache: () => {
        set({
          permissions: {},
          lastPermissionCheck: null
        })
      },
      
      // ============================================================================
      // GETTER FUNCTIONS - USER INFORMATION
      // ============================================================================
      
      getCurrentUser: () => get().user,
      
      getUserId: () => get().user?.id || null,
      
      getUserRole: () => get().user?.role || null,
      
      getUserEmail: () => get().user?.email || null,
      
      getUserName: () => {
        const user = get().user
        if (!user) return null
        
        if (user.firstName && user.lastName) {
          return `${user.firstName} ${user.lastName}`
        }
        
        return user.email || user.studentNumber || 'User'
      },
      
      // ============================================================================
      // GETTER FUNCTIONS - ROLE CHECKS
      // ============================================================================
      
      isAdmin: () => {
        const user = get().user
        return user?.role === USER_ROLES.ADMIN
      },
      
      isTeacher: () => {
        const user = get().user
        return user?.role === USER_ROLES.TEACHER
      },
      
      isHeadTeacher: () => {
        const user = get().user
        return user?.role === USER_ROLES.TEACHER && user?.teacherRole === TEACHER_ROLES.HEAD
      },
      
      isStudent: () => {
        const user = get().user
        return user?.role === USER_ROLES.STUDENT
      },
      
      hasRole: (roles) => {
        const user = get().user
        if (!user) return false
        
        const allowedRoles = Array.isArray(roles) ? roles : [roles]
        return allowedRoles.includes(user.role)
      },
      
      // ============================================================================
      // GETTER FUNCTIONS - PERMISSION CHECKS (CACHED)
      // ============================================================================
      
      canCreateCourse: () => get().permissions[PERMISSIONS.CREATE_COURSE] || false,
      canManageSystem: () => get().permissions[PERMISSIONS.MANAGE_SYSTEM] || false,
      canRemoveHeadTeacher: () => get().permissions[PERMISSIONS.REMOVE_HEAD_TEACHER] || false,
      canAddTeacher: () => get().permissions[PERMISSIONS.ADD_TEACHER] || false,
      canRemoveTeacher: () => get().permissions[PERMISSIONS.REMOVE_TEACHER] || false,
      canCreateClass: () => get().permissions[PERMISSIONS.CREATE_CLASS] || false,
      canImportStudents: () => get().permissions[PERMISSIONS.IMPORT_STUDENTS] || false,
      canScanAttendance: () => get().permissions[PERMISSIONS.SCAN_ATTENDANCE] || false,
      canCreateSession: () => get().permissions[PERMISSIONS.CREATE_SESSION] || false,
      canApproveReassignment: () => get().permissions[PERMISSIONS.APPROVE_REASSIGNMENT] || false,
      canViewAttendance: () => get().permissions[PERMISSIONS.VIEW_ATTENDANCE] || false,
      canModifySessionTimes: () => get().permissions[PERMISSIONS.MODIFY_SESSION_TIMES] || false,
      canManualAttendance: () => get().permissions[PERMISSIONS.MANUAL_ATTENDANCE] || false,
      canGenerateQR: () => get().permissions[PERMISSIONS.GENERATE_QR] || false,
      canViewOwnAttendance: () => get().permissions[PERMISSIONS.VIEW_OWN_ATTENDANCE] || false,
      canRequestReassignment: () => get().permissions[PERMISSIONS.REQUEST_REASSIGNMENT] || false,
      
      // ============================================================================
      // GETTER FUNCTIONS - BUSINESS LOGIC
      // ============================================================================
      
      getRedirectPath: () => {
        const user = get().user
        if (!user) return '/login'
        
        return getRoleRedirectPath(user.role)
      },
      
      getSessionTimeLeft: () => {
        // NextAuth handles session expiry automatically
        // This is for UI display purposes only
        const lastActivity = get().lastActivity
        if (!lastActivity) return 0
        
        const sessionDuration = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
        const elapsed = new Date().getTime() - lastActivity.getTime()
        const remaining = sessionDuration - elapsed
        
        return Math.max(0, remaining)
      },
      
      isSessionExpired: () => {
        return get().getSessionTimeLeft() <= 0
      },
      
      needsPasswordChange: () => {
        // Check if user needs to change their password (e.g., first login)
        const user = get().user
        return user?.role === USER_ROLES.TEACHER && !user.lastPasswordChange
      },
      
      getRemainingReassignmentRequests: () => {
        const user = get().user
        if (user?.role !== USER_ROLES.STUDENT) return 0
        
        // This would typically come from the user data or be fetched
        const usedRequests = user.usedReassignmentRequests || 0
        return Math.max(0, BUSINESS_RULES.MAX_REASSIGNMENT_REQUESTS - usedRequests)
      },
      
      // ============================================================================
      // UTILITY ACTIONS
      // ============================================================================
      
      clearErrors: () => {
        set({ 
          error: null,
          loginError: null
        })
      },
      
      resetState: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionStatus: 'unauthenticated',
          lastActivity: null,
          isLoggingIn: false,
          isLoggingOut: false,
          loginError: null,
          loginData: initialLoginData,
          loginMode: 'admin-teacher',
          permissions: {},
          lastPermissionCheck: null,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      },
      
      exportUserData: () => {
        const { user, lastActivity, sessionStatus } = get()
        
        return {
          user: user ? {
            id: user.id,
            role: user.role,
            email: user.email,
            studentNumber: user.studentNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            teacherRole: user.teacherRole,
            classId: user.classId,
            courseId: user.courseId
          } : null,
          sessionInfo: {
            isAuthenticated: get().isAuthenticated,
            sessionStatus,
            lastActivity: lastActivity?.toISOString(),
            sessionTimeLeft: get().getSessionTimeLeft()
          },
          permissions: get().permissions,
          exportedAt: new Date().toISOString()
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive UI state
        loginMode: state.loginMode,
        lastActivity: state.lastActivity,
        // Don't persist user data, permissions, or credentials
        // These should come from NextAuth on page load
      })
    }
  )
)

// ============================================================================
// REACT HOOK FOR NEXTAUTH INTEGRATION
// ============================================================================

/**
 * Hook to sync NextAuth session with Zustand store
 * Use this in your app root to keep the store in sync
 */
export function useAuthSync() {
  const { data: session, status } = useSession()
  const syncWithNextAuth = useAuthStore((state) => state.syncWithNextAuth)
  const refreshPermissions = useAuthStore((state) => state.refreshPermissions)
  
  // Sync session data whenever it changes
  React.useEffect(() => {
    syncWithNextAuth(session)
    
    // Refresh permissions when user logs in
    if (session?.user) {
      refreshPermissions()
    }
  }, [session, syncWithNextAuth, refreshPermissions])
  
  // Update session status
  React.useEffect(() => {
    useAuthStore.setState({ sessionStatus: status })
  }, [status])
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for authentication state
 */
export function useAuth() {
  return useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    sessionStatus: state.sessionStatus,
    isLoading: state.isLoading || state.sessionStatus === 'loading',
    error: state.error,
    isAdmin: state.isAdmin(),
    isTeacher: state.isTeacher(),
    isHeadTeacher: state.isHeadTeacher(),
    isStudent: state.isStudent(),
    getUserName: state.getUserName(),
    getRedirectPath: state.getRedirectPath()
  }))
}

/**
 * Hook for permission checks
 */
export function usePermissions() {
  return useAuthStore((state) => ({
    checkPermission: state.checkPermission,
    canCreateCourse: state.canCreateCourse(),
    canManageSystem: state.canManageSystem(),
    canRemoveHeadTeacher: state.canRemoveHeadTeacher(),
    canAddTeacher: state.canAddTeacher(),
    canRemoveTeacher: state.canRemoveTeacher(),
    canCreateClass: state.canCreateClass(),
    canImportStudents: state.canImportStudents(),
    canScanAttendance: state.canScanAttendance(),
    canCreateSession: state.canCreateSession(),
    canApproveReassignment: state.canApproveReassignment(),
    canViewAttendance: state.canViewAttendance(),
    canModifySessionTimes: state.canModifySessionTimes(),
    canManualAttendance: state.canManualAttendance(),
    canGenerateQR: state.canGenerateQR(),
    canViewOwnAttendance: state.canViewOwnAttendance(),
    canRequestReassignment: state.canRequestReassignment(),
    refreshPermissions: state.refreshPermissions
  }))
}

/**
 * Hook for login management
 */
export function useLogin() {
  return useAuthStore((state) => ({
    loginData: state.loginData,
    loginMode: state.loginMode,
    loginError: state.loginError,
    isLoggingIn: state.isLoggingIn,
    isLoggingOut: state.isLoggingOut,
    login: state.login,
    logout: state.logout,
    setLoginMode: state.setLoginMode,
    updateLoginData: state.updateLoginData,
    clearLoginData: state.clearLoginData,
    validateLoginData: state.validateLoginData,
    clearErrors: state.clearErrors
  }))
}
