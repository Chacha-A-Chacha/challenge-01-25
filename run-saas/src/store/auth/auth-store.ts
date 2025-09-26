// store/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { signIn, signOut } from 'next-auth/react'
import type {
  AuthUser,
  UserRole,
  BaseStoreState
} from '@/types'
import { USER_ROLES } from '@/types'
import { ERROR_MESSAGES } from '@/lib/constants'
import {
  validateForm,
  adminTeacherLoginSchema,
  studentLoginSchema,
  type AdminTeacherLogin,
  type StudentLogin
} from '@/lib/validations'

// ============================================================================
// TYPES - Only what's needed for auth state
// ============================================================================

// Use the validated types from lib/validations
type AdminTeacherLoginData = AdminTeacherLogin
type StudentLoginData = StudentLogin

// ============================================================================
// VALIDATION TYPES (Eliminating 'any')
// ============================================================================

// Generic type for validation results - reusable across the app
type ValidationResult<T> = {
  isValid: boolean
  errors: Record<string, string>
  data?: T
}

// Union type for login validation results
type LoginValidationResult =
  | ValidationResult<AdminTeacherLoginData>
  | ValidationResult<StudentLoginData>

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isAdminTeacherLogin(
  credentials: LoginCredentials,
  mode: string
): credentials is AdminTeacherLoginData {
  return mode === 'admin-teacher'
}

function isStudentLogin(
  credentials: LoginCredentials,
  mode: string
): credentials is StudentLoginData {
  return mode === 'student'
}

type LoginCredentials = AdminTeacherLoginData | StudentLoginData

interface LoginState {
  mode: 'admin-teacher' | 'student'
  data: AdminTeacherLoginData | StudentLoginData
  isLoggingIn: boolean
  loginError: string | null
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AuthState extends BaseStoreState {
  user: AuthUser | null
  isAuthenticated: boolean
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'

  login: LoginState

  signInUser: (credentials: LoginCredentials, mode: 'admin-teacher' | 'student') => Promise<boolean>
  signOutUser: () => Promise<void>
  syncSession: (sessionData: { user?: AuthUser } | null) => void
  updateLoginData: (data: Partial<LoginCredentials>) => void
  setLoginMode: (mode: 'admin-teacher' | 'student') => void

  getCurrentUser: () => AuthUser | null
  getUserRole: () => UserRole | null
  isAdmin: () => boolean
  isTeacher: () => boolean
  isStudent: () => boolean

  clearLoginError: () => void
  reset: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialAdminTeacherData: AdminTeacherLoginData = {
  email: '',
  password: ''
}

const initialStudentData: StudentLoginData = {
  studentNumber: '',
  phoneNumber: '',
  email: '',
  firstName: '',
  lastName: ''
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      lastUpdated: null,

      user: null,
      isAuthenticated: false,
      sessionStatus: 'loading',

      login: {
        mode: 'admin-teacher',
        data: initialAdminTeacherData,
        isLoggingIn: false,
        loginError: null
      },

      signInUser: async (credentials, mode) => {
        set(state => ({
          login: {
            ...state.login,
            isLoggingIn: true,
            loginError: null
          }
        }))

        try {
          // 🔹 Strongly typed validation using schema-generic validateForm
          let validation: LoginValidationResult

          if (isAdminTeacherLogin(credentials, mode)) {
            validation = validateForm(adminTeacherLoginSchema, credentials)
          } else if (isStudentLogin(credentials, mode)) {
            validation = validateForm(studentLoginSchema, credentials)
          } else {
            throw new Error('Invalid login mode')
          }

          if (!validation.isValid) {
            const firstError = Object.values(validation.errors)[0]
            throw new Error(firstError || 'Invalid credentials')
          }

          const providerId = mode === 'admin-teacher' ? 'credentials' : 'student-auth'
          const result = await signIn(providerId, {
            ...(validation.data || {}),
            redirect: false
          })

          if (result?.error) {
            throw new Error(
              result.error === 'CredentialsSignin'
                ? ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS
                : result.error
            )
          }

          if (result?.ok) {
            const clearedData =
              mode === 'admin-teacher'
                ? initialAdminTeacherData
                : initialStudentData

            set(state => ({
              login: {
                ...state.login,
                isLoggingIn: false,
                loginError: null,
                data: clearedData
              }
            }))
            return true
          }

          throw new Error('Login failed')
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS

          set(state => ({
            login: {
              ...state.login,
              loginError: errorMessage,
              isLoggingIn: false
            }
          }))

          return false
        }
      },

      signOutUser: async () => {
        set({ isLoading: true })

        try {
          await signOut({ redirect: false })
          get().reset()
        } catch (error) {
          console.error('Logout failed:', error)
          set({ isLoading: false })
        }
      },

      syncSession: (sessionData) => {
        if (sessionData?.user) {
          const user = sessionData.user as AuthUser

          if (user.id && user.role) {
            set({
              user,
              isAuthenticated: true,
              sessionStatus: 'authenticated',
              lastUpdated: new Date()
            })
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            sessionStatus: 'unauthenticated'
          })
        }
      },

      updateLoginData: (data) => {
        set(state => ({
          login: {
            ...state.login,
            data: { ...state.login.data, ...data },
            loginError: null
          }
        }))
      },

      setLoginMode: (mode) => {
        const newData =
          mode === 'admin-teacher'
            ? initialAdminTeacherData
            : initialStudentData

        set(state => ({
          login: {
            ...state.login,
            mode,
            data: newData,
            loginError: null
          }
        }))
      },

      getCurrentUser: () => get().user,
      getUserRole: () => get().user?.role || null,
      isAdmin: () => get().user?.role === USER_ROLES.ADMIN,
      isTeacher: () => get().user?.role === USER_ROLES.TEACHER,
      isStudent: () => get().user?.role === USER_ROLES.STUDENT,

      clearLoginError: () => {
        set(state => ({
          login: { ...state.login, loginError: null }
        }))
      },

      reset: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionStatus: 'unauthenticated',
          login: {
            mode: 'admin-teacher',
            data: initialAdminTeacherData,
            isLoggingIn: false,
            loginError: null
          },
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        login: {
          mode: state.login.mode
        }
      })
    }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export function useAuth() {
  return useAuthStore(state => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    sessionStatus: state.sessionStatus,
    isLoading: state.isLoading || state.sessionStatus === 'loading',
    // 🔹 keep as functions (not booleans)
    isAdmin: state.isAdmin,
    isTeacher: state.isTeacher,
    isStudent: state.isStudent,
    getUserRole: state.getUserRole
  }))
}

export function useLogin() {
  return useAuthStore(state => ({
    loginData: state.login.data,
    loginMode: state.login.mode,
    loginError: state.login.loginError,
    isLoggingIn: state.login.isLoggingIn,
    signIn: state.signInUser,
    signOut: state.signOutUser,
    updateLoginData: state.updateLoginData,
    setLoginMode: state.setLoginMode,
    clearLoginError: state.clearLoginError
  }))
}
