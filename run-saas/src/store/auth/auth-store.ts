// store/auth/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole, TeacherRole } from '@/types'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpiry: Date | null
  lastActivity: Date | null
  
  // Actions
  login: (user: AuthUser) => void
  logout: () => void
  updateProfile: (updates: Partial<AuthUser>) => void
  updateLastActivity: () => void
  checkSession: () => boolean
  extendSession: () => void
  
  // Getters
  isAdmin: () => boolean
  isTeacher: () => boolean
  isHeadTeacher: () => boolean
  isStudent: () => boolean
  hasPermission: (action: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      sessionExpiry: null,
      lastActivity: null,
      
      login: (user) => {
        const now = new Date()
        const expiry = new Date(now.getTime() + 8 * 60 * 60 * 1000) // 8 hours
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          sessionExpiry: expiry,
          lastActivity: now
        })
      },
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionExpiry: null,
        lastActivity: null
      }),
      
      updateProfile: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      
      updateLastActivity: () => set({ lastActivity: new Date() }),
      
      checkSession: () => {
        const { sessionExpiry } = get()
        if (!sessionExpiry) return false
        return new Date() < sessionExpiry
      },
      
      extendSession: () => {
        const now = new Date()
        const expiry = new Date(now.getTime() + 8 * 60 * 60 * 1000)
        set({ sessionExpiry: expiry, lastActivity: now })
      },
      
      // Permission getters
      isAdmin: () => get().user?.role === UserRole.ADMIN,
      isTeacher: () => get().user?.role === UserRole.TEACHER,
      isHeadTeacher: () => get().user?.role === UserRole.TEACHER && get().user?.teacherRole === TeacherRole.HEAD,
      isStudent: () => get().user?.role === UserRole.STUDENT,
      
      hasPermission: (action: string) => {
        const { user } = get()
        if (!user) return false
        
        const permissions: Record<string, boolean> = {
          // Admin permissions
          'create_course': user.role === UserRole.ADMIN,
          'manage_system': user.role === UserRole.ADMIN,
          'remove_head_teacher': user.role === UserRole.ADMIN,
          'declare_program_end': user.role === UserRole.ADMIN,
          
          // Head teacher permissions
          'add_teacher': user.role === UserRole.TEACHER && user.teacherRole === TeacherRole.HEAD,
          'remove_teacher': user.role === UserRole.TEACHER && user.teacherRole === TeacherRole.HEAD,
          'create_class': user.role === UserRole.TEACHER && user.teacherRole === TeacherRole.HEAD,
          
          // All teacher permissions
          'import_students': user.role === UserRole.TEACHER,
          'scan_attendance': user.role === UserRole.TEACHER,
          'create_session': user.role === UserRole.TEACHER,
          'approve_reassignment': user.role === UserRole.TEACHER,
          'view_attendance': user.role === UserRole.TEACHER,
          'modify_session_times': user.role === UserRole.TEACHER,
          'manual_attendance': user.role === UserRole.TEACHER,
          
          // Student permissions
          'generate_qr': user.role === UserRole.STUDENT,
          'view_own_attendance': user.role === UserRole.STUDENT,
          'request_reassignment': user.role === UserRole.STUDENT
        }
        
        return permissions[action] || false
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
        lastActivity: state.lastActivity
      })
    }
  )
)
