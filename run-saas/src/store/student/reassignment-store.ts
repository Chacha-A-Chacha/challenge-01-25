// store/student/reassignment-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  BaseStoreState,
  ReassignmentRequest,
  Session,
  WeekDay,
  ApiResponse
} from '@/types'
import { API_ROUTES } from '@/lib/constants'
import { fetchWithTimeout } from '@/lib/utils'

// ============================================================================
// TYPES - Only what's needed for reassignment state
// ============================================================================

interface ReassignmentOption {
  session: Session
  availableSpots: number
  canRequest: boolean
}

interface ReassignmentConfig {
  maxRequests: number
  remainingRequests: number
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface ReassignmentState extends BaseStoreState {
  // Core data
  requests: ReassignmentRequest[]
  availableOptions: {
    saturday: ReassignmentOption[]
    sunday: ReassignmentOption[]
  }

  // Simple config
  config: ReassignmentConfig

  // Loading states
  isSubmitting: boolean
  isLoadingOptions: boolean

  // Actions
  loadRequests: () => Promise<void>
  loadAvailableOptions: () => Promise<void>
  submitRequest: (fromSessionId: string, toSessionId: string) => Promise<boolean>
  cancelRequest: (requestId: string) => Promise<boolean>

  // Computed
  getPendingRequests: () => ReassignmentRequest[]
  canSubmitRequest: () => boolean
  getOptionsForDay: (day: WeekDay) => ReassignmentOption[]

  // Utils
  clearErrors: () => void
  reset: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ReassignmentConfig = {
  maxRequests: 3,
  remainingRequests: 3
}

const EMPTY_OPTIONS = {
  saturday: [],
  sunday: []
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateRemainingRequests(requests: ReassignmentRequest[], maxRequests: number): number {
  return Math.max(0, maxRequests - requests.length)
}

function hasActivePendingRequest(requests: ReassignmentRequest[]): boolean {
  return requests.some(req => req.status === 'PENDING')
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useReassignmentStore = create<ReassignmentState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core data
      requests: [],
      availableOptions: EMPTY_OPTIONS,

      // Config
      config: DEFAULT_CONFIG,

      // Loading states
      isSubmitting: false,
      isLoadingOptions: false,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      loadRequests: async () => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENT}/reassignment-requests`)

          if (!response.ok) {
            throw new Error(`Failed to load requests: ${response.status}`)
          }

          const result: ApiResponse<ReassignmentRequest[]> = await response.json()

          if (result.success && result.data) {
            const requests = result.data
            const remainingRequests = calculateRemainingRequests(requests, get().config.maxRequests)

            set({
              requests,
              config: { ...get().config, remainingRequests },
              isLoading: false,
              lastUpdated: new Date()
            })
          } else {
            throw new Error(result.error || 'Failed to load reassignment requests')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load requests'
          set({
            error: errorMessage,
            isLoading: false
          })
        }
      },

      loadAvailableOptions: async () => {
        set({ isLoadingOptions: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENT}/reassignment-options`)

          if (!response.ok) {
            throw new Error(`Failed to load options: ${response.status}`)
          }

          const result: ApiResponse<{ saturday: ReassignmentOption[]; sunday: ReassignmentOption[] }> = await response.json()

          if (result.success && result.data) {
            set({
              availableOptions: result.data,
              isLoadingOptions: false,
              lastUpdated: new Date()
            })
          } else {
            throw new Error(result.error || 'Failed to load available options')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load options'
          set({
            error: errorMessage,
            isLoadingOptions: false
          })
        }
      },

      submitRequest: async (fromSessionId, toSessionId) => {
        if (!get().canSubmitRequest()) {
          set({ error: 'Cannot submit request at this time' })
          return false
        }

        set({ isSubmitting: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENT}/reassignment-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromSessionId,
              toSessionId
            })
          })

          if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`)
          }

          const result: ApiResponse<ReassignmentRequest> = await response.json()

          if (result.success && result.data) {
            // Add new request to state
            const newRequest = result.data
            const updatedRequests = [...get().requests, newRequest]
            const remainingRequests = calculateRemainingRequests(updatedRequests, get().config.maxRequests)

            set({
              requests: updatedRequests,
              config: { ...get().config, remainingRequests },
              isSubmitting: false,
              lastUpdated: new Date()
            })

            return true
          } else {
            throw new Error(result.error || 'Failed to submit request')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to submit request'
          set({
            error: errorMessage,
            isSubmitting: false
          })
          return false
        }
      },

      cancelRequest: async (requestId) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENT}/reassignment-requests/${requestId}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            throw new Error(`Cancel failed: ${response.status}`)
          }

          const result: ApiResponse<void> = await response.json()

          if (result.success) {
            // Remove request from state
            const updatedRequests = get().requests.filter(req => req.id !== requestId)
            const remainingRequests = calculateRemainingRequests(updatedRequests, get().config.maxRequests)

            set({
              requests: updatedRequests,
              config: { ...get().config, remainingRequests },
              isLoading: false,
              lastUpdated: new Date()
            })

            return true
          } else {
            throw new Error(result.error || 'Failed to cancel request')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to cancel request'
          set({
            error: errorMessage,
            isLoading: false
          })
          return false
        }
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getPendingRequests: () => {
        return get().requests.filter(req => req.status === 'PENDING')
      },

      canSubmitRequest: () => {
        const { config, requests } = get()
        return config.remainingRequests > 0 && !hasActivePendingRequest(requests)
      },

      getOptionsForDay: (day) => {
        const { availableOptions } = get()
        return day === 'SATURDAY' ? availableOptions.saturday : availableOptions.sunday
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      clearErrors: () => {
        set({ error: null })
      },

      reset: () => {
        set({
          requests: [],
          availableOptions: EMPTY_OPTIONS,
          config: DEFAULT_CONFIG,
          isSubmitting: false,
          isLoadingOptions: false,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'reassignment-store',
      partialize: (state) => ({
        // Only persist config (user's remaining request count)
        config: state.config
        // Don't persist requests, options, or loading states
      })
    }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for reassignment requests data
 */
export function useReassignmentRequests() {
  return useReassignmentStore(state => ({
    requests: state.requests,
    pendingRequests: state.getPendingRequests(),
    isLoading: state.isLoading,
    loadRequests: state.loadRequests
  }))
}

/**
 * Hook for reassignment actions
 */
export function useReassignmentActions() {
  return useReassignmentStore(state => ({
    canSubmit: state.canSubmitRequest(),
    remainingRequests: state.config.remainingRequests,
    isSubmitting: state.isSubmitting,
    submitRequest: state.submitRequest,
    cancelRequest: state.cancelRequest,
    error: state.error,
    clearErrors: state.clearErrors
  }))
}

/**
 * Hook for available options
 */
export function useReassignmentOptions() {
  return useReassignmentStore(state => ({
    options: state.availableOptions,
    isLoadingOptions: state.isLoadingOptions,
    getOptionsForDay: state.getOptionsForDay,
    loadOptions: state.loadAvailableOptions
  }))
}
