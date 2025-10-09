// store/auth-store.ts
import {create} from 'zustand'
import {persist} from 'zustand/middleware'
import { shallow } from "zustand/vanilla/shallow";
import type {AuthUser, UserRole} from '@/types'
import {USER_ROLES} from '@/types'

interface AuthState {
    // Session state (synced from NextAuth)
    user: AuthUser | null
    isAuthenticated: boolean
    sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'

    // Actions
    syncSession: (sessionData: { user?: AuthUser } | null) => void
    clearSession: () => void

    // Computed
    getUserRole: () => UserRole | null
    isAdmin: () => boolean
    isTeacher: () => boolean
    isStudent: () => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            isAuthenticated: false,
            sessionStatus: 'loading',

            // Sync session from NextAuth
            syncSession: (sessionData) => {
                if (sessionData?.user) {
                    const user = sessionData.user as AuthUser
                    if (user.id && user.role) {
                        set({
                            user,
                            isAuthenticated: true,
                            sessionStatus: 'authenticated'
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

            clearSession: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    sessionStatus: 'unauthenticated'
                })
            },

            // Computed getters
            getUserRole: () => get().user?.role || null,
            isAdmin: () => get().user?.role === USER_ROLES.ADMIN,
            isTeacher: () => get().user?.role === USER_ROLES.TEACHER,
            isStudent: () => get().user?.role === USER_ROLES.STUDENT
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({
                // Don't persist sensitive data, only UI preferences if needed
            })
        }
    )
)

// Convenience hook
export function useAuth() {
    return useAuthStore(state => ({
            user: state.user,
            isAuthenticated: state.isAuthenticated,
            sessionStatus: state.sessionStatus,
            isAdmin: state.isAdmin,
            isTeacher: state.isTeacher,
            isStudent: state.isStudent,
            getUserRole: state.getUserRole,
            syncSession: state.syncSession
        }),
    )
}
