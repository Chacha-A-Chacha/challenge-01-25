// store/offline-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BaseStoreState,
  ApiResponse
} from '@/types'
import { API_ROUTES } from '@/lib/constants'
import { fetchWithTimeout, validateQRData } from '@/lib/utils'

// ============================================================================
// TYPES - Only what's needed for offline state
// ============================================================================

interface OfflineAttendanceRecord {
  id: string
  studentUuid: string
  studentNumber: string
  sessionId: string
  qrData: string
  timestamp: string
  retryCount: number
  lastAttempt: Date | null
  lastError?: string
}

interface NetworkStatus {
  isOnline: boolean
  lastOnlineCheck: Date | null
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
}

interface SyncProgress {
  isActive: boolean
  total: number
  completed: number
  failed: number
  currentItem?: string
}

interface OfflineConfig {
  autoSyncEnabled: boolean
  maxRetries: number
  syncInterval: number
  maxOfflineAge: number // hours
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface OfflineState extends BaseStoreState {
  // Core offline data
  pendingAttendance: OfflineAttendanceRecord[]
  failedSyncs: OfflineAttendanceRecord[]

  // Network state
  network: NetworkStatus

  // Sync state
  syncProgress: SyncProgress
  lastSyncAttempt: Date | null

  // Configuration
  config: OfflineConfig

  // Actions
  addPendingAttendance: (data: {
    studentUuid: string
    studentNumber: string
    sessionId: string
    qrData: string
  }) => string

  syncPendingData: () => Promise<{ success: boolean; syncedCount: number; failedCount: number }>
  retryFailedSync: (id: string) => Promise<boolean>

  updateNetworkStatus: (isOnline: boolean, quality?: NetworkStatus['connectionQuality']) => void
  setConfig: (config: Partial<OfflineConfig>) => void

  // Computed
  getTotalPending: () => number
  canSync: () => boolean
  hasPendingData: () => boolean

  // Utils
  clearPendingData: () => void
  clearFailedSyncs: () => void
  removeExpiredRecords: () => void
  reset: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: OfflineConfig = {
  autoSyncEnabled: true,
  maxRetries: 3,
  syncInterval: 30000, // 30 seconds
  maxOfflineAge: 24 // 24 hours
}

const INITIAL_NETWORK_STATUS: NetworkStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastOnlineCheck: new Date(),
  connectionQuality: 'excellent'
}

const INITIAL_SYNC_PROGRESS: SyncProgress = {
  isActive: false,
  total: 0,
  completed: 0,
  failed: 0
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function isRecordExpired(record: OfflineAttendanceRecord, maxAgeHours: number): boolean {
  const recordTime = new Date(record.timestamp).getTime()
  const maxAge = maxAgeHours * 60 * 60 * 1000
  return Date.now() - recordTime > maxAge
}

function shouldRetry(record: OfflineAttendanceRecord, maxRetries: number): boolean {
  return record.retryCount < maxRetries
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core data
      pendingAttendance: [],
      failedSyncs: [],

      // Network state
      network: INITIAL_NETWORK_STATUS,

      // Sync state
      syncProgress: INITIAL_SYNC_PROGRESS,
      lastSyncAttempt: null,

      // Configuration
      config: DEFAULT_CONFIG,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      addPendingAttendance: (data) => {
        // Validate QR data
        const qrValidation = validateQRData(data.qrData)
        if (!qrValidation) {
          throw new Error('Invalid QR code format')
        }

        // Create offline record
        const id = generateOfflineId()
        const record: OfflineAttendanceRecord = {
          id,
          ...data,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          lastAttempt: null
        }

        set(state => ({
          pendingAttendance: [...state.pendingAttendance, record],
          lastUpdated: new Date()
        }))

        // Try immediate sync if online
        if (get().network.isOnline && get().config.autoSyncEnabled) {
          setTimeout(() => get().syncPendingData(), 100)
        }

        return id
      },

      syncPendingData: async () => {
        const { pendingAttendance, network, config } = get()

        if (!network.isOnline || pendingAttendance.length === 0) {
          return { success: false, syncedCount: 0, failedCount: 0 }
        }

        set({
          syncProgress: {
            isActive: true,
            total: pendingAttendance.length,
            completed: 0,
            failed: 0
          },
          lastSyncAttempt: new Date()
        })

        // Helper function to sync a single record
        const syncSingleRecord = async (record: OfflineAttendanceRecord): Promise<boolean> => {
          try {
            const response = await fetchWithTimeout(API_ROUTES.ATTENDANCE_SCAN, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Offline-Sync': 'true'
              },
              body: JSON.stringify({
                qrData: record.qrData,
                sessionId: record.sessionId,
                offlineTimestamp: record.timestamp,
                studentUuid: record.studentUuid
              })
            }, 10000) // 10 second timeout for offline sync

            const result: ApiResponse<unknown> = await response.json()
            return result.success

          } catch (error) {
            console.error('Failed to sync record:', record.id, error)
            return false
          }
        }

        let syncedCount = 0
        let failedCount = 0

        try {
          for (const record of pendingAttendance) {
            try {
              set(state => ({
                syncProgress: {
                  ...state.syncProgress,
                  currentItem: `${record.studentNumber} - Session ${record.sessionId.slice(-6)}`
                }
              }))

              const success = await syncSingleRecord(record)

              if (success) {
                // Remove from pending
                set(state => ({
                  pendingAttendance: state.pendingAttendance.filter(p => p.id !== record.id)
                }))
                syncedCount++
              } else {
                // Move to failed or retry
                if (shouldRetry(record, config.maxRetries)) {
                  set(state => ({
                    pendingAttendance: state.pendingAttendance.map(p =>
                      p.id === record.id
                        ? { ...p, retryCount: p.retryCount + 1, lastAttempt: new Date() }
                        : p
                    )
                  }))
                } else {
                  // Move to failed syncs
                  set(state => ({
                    pendingAttendance: state.pendingAttendance.filter(p => p.id !== record.id),
                    failedSyncs: [...state.failedSyncs, {
                      ...record,
                      lastError: 'Max retries exceeded'
                    }]
                  }))
                }
                failedCount++
              }

              set(state => ({
                syncProgress: {
                  ...state.syncProgress,
                  completed: state.syncProgress.completed + 1,
                  failed: success ? state.syncProgress.failed : state.syncProgress.failed + 1
                }
              }))

              // Small delay between syncs
              await new Promise(resolve => setTimeout(resolve, 200))

            } catch (error) {
              failedCount++
              console.error('Sync error for record:', record.id, error)
            }
          }

          return { success: syncedCount > 0, syncedCount, failedCount }

        } finally {
          set({
            syncProgress: INITIAL_SYNC_PROGRESS,
            lastUpdated: new Date()
          })
        }
      },

      retryFailedSync: async (id) => {
        const { failedSyncs, network } = get()
        const failed = failedSyncs.find(f => f.id === id)

        if (!failed || !network.isOnline) {
          return false
        }

        // Move back to pending with reset retry count
        const resetRecord = {
          ...failed,
          retryCount: 0,
          lastAttempt: null,
          lastError: undefined
        }

        set(state => ({
          failedSyncs: state.failedSyncs.filter(f => f.id !== id),
          pendingAttendance: [...state.pendingAttendance, resetRecord]
        }))

        // Try sync immediately
        const result = await get().syncPendingData()
        return result.syncedCount > 0
      },

      updateNetworkStatus: (isOnline, quality = 'excellent') => {
        set(state => ({
          network: {
            isOnline,
            lastOnlineCheck: new Date(),
            connectionQuality: isOnline ? quality : 'offline'
          },
          lastUpdated: new Date()
        }))

        // Auto-sync when coming back online
        if (isOnline && get().config.autoSyncEnabled && get().hasPendingData()) {
          setTimeout(() => get().syncPendingData(), 1000)
        }
      },

      setConfig: (newConfig) => {
        set(state => ({
          config: { ...state.config, ...newConfig }
        }))
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getTotalPending: () => {
        const { pendingAttendance, failedSyncs } = get()
        return pendingAttendance.length + failedSyncs.length
      },

      canSync: () => {
        const { network, syncProgress } = get()
        return network.isOnline && !syncProgress.isActive
      },

      hasPendingData: () => {
        return get().getTotalPending() > 0
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      clearPendingData: () => {
        set({
          pendingAttendance: [],
          lastUpdated: new Date()
        })
      },

      clearFailedSyncs: () => {
        set({
          failedSyncs: [],
          lastUpdated: new Date()
        })
      },

      removeExpiredRecords: () => {
        const { config } = get()

        set(state => {
          const validPending = state.pendingAttendance.filter(
            record => !isRecordExpired(record, config.maxOfflineAge)
          )
          const validFailed = state.failedSyncs.filter(
            record => !isRecordExpired(record, config.maxOfflineAge)
          )

          return {
            pendingAttendance: validPending,
            failedSyncs: validFailed,
            lastUpdated: new Date()
          }
        })
      },

      reset: () => {
        set({
          pendingAttendance: [],
          failedSyncs: [],
          network: INITIAL_NETWORK_STATUS,
          syncProgress: INITIAL_SYNC_PROGRESS,
          lastSyncAttempt: null,
          config: DEFAULT_CONFIG,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'offline-store',
      partialize: (state) => ({
        // Only persist offline data and config
        pendingAttendance: state.pendingAttendance,
        failedSyncs: state.failedSyncs,
        config: state.config,
        network: {
          // Don't persist connection status, but keep quality preference
          connectionQuality: state.network.connectionQuality
        }
      })
    }
  )
)

// ============================================================================
// BROWSER EVENT LISTENERS
// ============================================================================

if (typeof window !== 'undefined') {
  const store = useOfflineStore.getState()

  // Listen for online/offline events
  window.addEventListener('online', () => {
    store.updateNetworkStatus(true)
  })

  window.addEventListener('offline', () => {
    store.updateNetworkStatus(false, 'offline')
  })

  // Clean up expired records periodically
  setInterval(() => {
    store.removeExpiredRecords()
  }, 300000) // Every 5 minutes
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for offline data management
 */
export function useOfflineData() {
  return useOfflineStore(state => ({
    pendingCount: state.pendingAttendance.length,
    failedCount: state.failedSyncs.length,
    totalPending: state.getTotalPending(),
    hasPendingData: state.hasPendingData(),
    addPending: state.addPendingAttendance,
    clearPending: state.clearPendingData,
    clearFailed: state.clearFailedSyncs
  }))
}

/**
 * Hook for sync operations
 */
export function useOfflineSync() {
  return useOfflineStore(state => ({
    canSync: state.canSync(),
    syncProgress: state.syncProgress,
    lastSyncAttempt: state.lastSyncAttempt,
    syncPending: state.syncPendingData,
    retryFailed: state.retryFailedSync,
    isOnline: state.network.isOnline,
    connectionQuality: state.network.connectionQuality
  }))
}

/**
 * Hook for offline configuration
 */
export function useOfflineConfig() {
  return useOfflineStore(state => ({
    config: state.config,
    setConfig: state.setConfig,
    updateNetworkStatus: state.updateNetworkStatus
  }))
}
