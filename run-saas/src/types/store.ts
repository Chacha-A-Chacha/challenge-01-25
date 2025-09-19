// types/store.ts
import type { PaginationConfig } from './utils'

export interface BaseStoreState {
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface EntityStoreState<T> extends BaseStoreState {
  items: T[]
  selectedItem: T | null
  searchQuery: string
  filters: Record<string, unknown>
  pagination: PaginationConfig
}

export interface OfflineAttendance {
  id: string
  studentUuid: string
  studentNumber: string
  sessionId: string
  timestamp: string
  qrData: string
  retryCount: number
  maxRetries: number
  lastAttempt?: Date
}

export interface SyncStatus {
  pending: number
  synced: number
  failed: number
  lastSync?: Date
  isOnline: boolean
  isSyncing: boolean
}

export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: T
  originalValue?: T
  timestamp: Date
  rollback: () => void
}

export interface OptimisticState<T> {
  items: T[]
  pendingUpdates: OptimisticUpdate<T>[]
  addOptimistic: (update: OptimisticUpdate<T>) => void
  confirmUpdate: (id: string) => void
  rollbackUpdate: (id: string) => void
  rollbackAll: () => void
}
