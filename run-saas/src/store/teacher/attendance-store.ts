// store/teacher/attendance-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BaseStoreState,
  Session,
  AttendanceRecord,
  AttendanceStatus,
  ApiResponse
} from '@/types'
import { API_ROUTES } from '@/lib/constants'
import { fetchWithTimeout, validateQRData } from '@/lib/utils'

// ============================================================================
// TYPES - Only what's needed for attendance state
// ============================================================================

// Internal store type with Date objects (converted from API strings)
interface AttendanceRecordWithDates {
  id: string
  studentId: string
  studentName: string
  studentNumber: string
  sessionId: string
  date: Date  // ✅ Date object for internal use
  status: AttendanceStatus
  scanTime?: string
  markedBy?: string
  isLate?: boolean
  notes?: string
}

interface SessionAttendanceData {
  session: Session
  attendanceRecords: AttendanceRecordWithDates[]  // ✅ Uses Date objects
  totalStudents: number
  presentCount: number
  absentCount: number
  wrongSessionCount: number
}

interface QRScanState {
  isScanning: boolean
  lastScanResult: {
    success: boolean
    message: string
    attendance?: AttendanceRecordWithDates  // ✅ Use internal type with Date
    status?: AttendanceStatus
  } | null
  scanError: string | null
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AttendanceState extends BaseStoreState {
  // Core data
  currentSessionData: SessionAttendanceData | null
  scanState: QRScanState

  // Loading states
  isLoadingSession: boolean
  isMarkingAttendance: boolean

  // Actions
  loadSessionAttendance: (sessionId: string) => Promise<void>
  scanQRCode: (qrData: string) => Promise<boolean>
  markManualAttendance: (studentId: string, status: AttendanceStatus) => Promise<boolean>
  bulkMarkAbsent: (studentIds: string[]) => Promise<boolean>

  // QR Scanner actions
  startScanning: () => void
  stopScanning: () => void
  clearScanError: () => void

  // Computed
  getAttendanceRate: () => number
  getPresentStudents: () => AttendanceRecordWithDates[]
  getAbsentStudents: () => AttendanceRecordWithDates[]

  // Utils
  clearErrors: () => void
  reset: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_QR_SCAN_STATE: QRScanState = {
  isScanning: false,
  lastScanResult: null,
  scanError: null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAttendanceStats(records: AttendanceRecordWithDates[]) {
  const presentCount = records.filter(r => r.status === 'PRESENT').length
  const absentCount = records.filter(r => r.status === 'ABSENT').length
  const wrongSessionCount = records.filter(r => r.status === 'WRONG_SESSION').length

  return {
    presentCount,
    absentCount,
    wrongSessionCount
  }
}

function updateAttendanceRecord(
  records: AttendanceRecordWithDates[],
  studentId: string,
  newStatus: AttendanceStatus,
  scanTime?: string
): AttendanceRecordWithDates[] {
  return records.map(record =>
    record.studentId === studentId
      ? { ...record, status: newStatus, scanTime: scanTime || record.scanTime }
      : record
  )
}

// ✅ FIX: Transform API data (date: string) to internal data (date: Date)
function transformAttendanceRecords(apiRecords: AttendanceRecord[]): AttendanceRecordWithDates[] {
  return apiRecords.map(record => ({
    ...record,
    date: new Date(record.date)  // Convert string to Date object
  }))
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core data
      currentSessionData: null,
      scanState: DEFAULT_QR_SCAN_STATE,

      // Loading states
      isLoadingSession: false,
      isMarkingAttendance: false,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      loadSessionAttendance: async (sessionId) => {
        set({ isLoadingSession: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.ATTENDANCE_SCAN}/session/${sessionId}`)

          if (!response.ok) {
            throw new Error(`Failed to load attendance: ${response.status}`)
          }

          const result: ApiResponse<{
            session: Session
            attendanceRecords: AttendanceRecord[]
            totalStudents: number
          }> = await response.json()

          if (result.success && result.data) {
            const { session, attendanceRecords, totalStudents } = result.data

            // ✅ FIX: Transform API data (string dates) to internal format (Date objects)
            const recordsWithDates = transformAttendanceRecords(attendanceRecords)
            const stats = calculateAttendanceStats(recordsWithDates)

            set({
              currentSessionData: {
                session,
                attendanceRecords: recordsWithDates,  // ✅ Now uses Date objects
                totalStudents,
                ...stats
              },
              isLoadingSession: false,
              lastUpdated: new Date()
            })
          } else {
            throw new Error(result.error || 'Failed to load session attendance')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load attendance'
          set({
            error: errorMessage,
            isLoadingSession: false
          })
        }
      },

      scanQRCode: async (qrData) => {
        const { currentSessionData } = get()

        if (!currentSessionData) {
          set({
            scanState: {
              ...get().scanState,
              scanError: 'No active session selected'
            }
          })
          return false
        }

        set({ isMarkingAttendance: true })

        try {
          // Validate QR data format
          const qrValidation = validateQRData(qrData)
          if (!qrValidation) {
            throw new Error('Invalid QR code format')
          }

          const response = await fetchWithTimeout(API_ROUTES.ATTENDANCE_SCAN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qrData,
              sessionId: currentSessionData.session.id
            })
          })

          if (!response.ok) {
            throw new Error(`Scan failed: ${response.status}`)
          }

          const result: ApiResponse<{
            attendance: AttendanceRecord
            message: string
            status: AttendanceStatus
          }> = await response.json()

          if (result.success && result.data) {
            const { attendance, message, status } = result.data

            // ✅ Create a properly formatted attendance record with Date object
            const attendanceWithDate: AttendanceRecordWithDates = {
              ...attendance,
              date: new Date(attendance.date)  // Convert API string date to Date object
            }

            // Update local attendance records
            const updatedRecords = updateAttendanceRecord(
              currentSessionData.attendanceRecords,
              attendance.studentId,
              status,
              attendance.scanTime
            )

            const stats = calculateAttendanceStats(updatedRecords)

            set({
              currentSessionData: {
                ...currentSessionData,
                attendanceRecords: updatedRecords,
                ...stats
              },
              scanState: {
                isScanning: true, // Keep scanning active
                lastScanResult: { success: true, message, attendance: attendanceWithDate, status },
                scanError: null
              },
              isMarkingAttendance: false,
              lastUpdated: new Date()
            })

            return true
          } else {
            throw new Error(result.error || 'Failed to process QR scan')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'QR scan failed'
          set({
            scanState: {
              ...get().scanState,
              lastScanResult: { success: false, message: errorMessage },
              scanError: errorMessage
            },
            isMarkingAttendance: false
          })
          return false
        }
      },

      markManualAttendance: async (studentId, status) => {
        const { currentSessionData } = get()

        if (!currentSessionData) {
          set({ error: 'No active session selected' })
          return false
        }

        set({ isMarkingAttendance: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.ATTENDANCE_SCAN}/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId,
              sessionId: currentSessionData.session.id,
              status
            })
          })

          if (!response.ok) {
            throw new Error(`Manual attendance failed: ${response.status}`)
          }

          const result: ApiResponse<AttendanceRecord> = await response.json()

          if (result.success && result.data) {
            const attendance = result.data

            // ✅ Convert the attendance record date to Date object
            const attendanceWithDate: AttendanceRecordWithDates = {
              ...attendance,
              date: new Date(attendance.date)
            }

            // Update local attendance records
            const updatedRecords = updateAttendanceRecord(
              currentSessionData.attendanceRecords,
              studentId,
              status,
              attendance.scanTime
            )

            const stats = calculateAttendanceStats(updatedRecords)

            set({
              currentSessionData: {
                ...currentSessionData,
                attendanceRecords: updatedRecords,
                ...stats
              },
              isMarkingAttendance: false,
              lastUpdated: new Date()
            })

            return true
          } else {
            throw new Error(result.error || 'Failed to mark attendance')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to mark attendance'
          set({
            error: errorMessage,
            isMarkingAttendance: false
          })
          return false
        }
      },

      bulkMarkAbsent: async (studentIds) => {
        const { currentSessionData } = get()

        if (!currentSessionData || studentIds.length === 0) {
          return false
        }

        set({ isMarkingAttendance: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.ATTENDANCE_SCAN}/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSessionData.session.id,
              attendanceRecords: studentIds.map(studentId => ({
                studentId,
                status: 'ABSENT' as AttendanceStatus
              }))
            })
          })

          if (!response.ok) {
            throw new Error(`Bulk attendance failed: ${response.status}`)
          }

          const result: ApiResponse<AttendanceRecord[]> = await response.json()

          if (result.success && result.data) {
            // ✅ Transform the bulk response data to use Date objects
            const attendanceRecordsWithDates = transformAttendanceRecords(result.data)

            // Update multiple records
            let updatedRecords = [...currentSessionData.attendanceRecords]

            studentIds.forEach(studentId => {
              updatedRecords = updateAttendanceRecord(updatedRecords, studentId, 'ABSENT')
            })

            const stats = calculateAttendanceStats(updatedRecords)

            set({
              currentSessionData: {
                ...currentSessionData,
                attendanceRecords: updatedRecords,
                ...stats
              },
              isMarkingAttendance: false,
              lastUpdated: new Date()
            })

            return true
          } else {
            throw new Error(result.error || 'Failed to bulk mark attendance')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bulk attendance failed'
          set({
            error: errorMessage,
            isMarkingAttendance: false
          })
          return false
        }
      },

      // ============================================================================
      // QR SCANNER ACTIONS
      // ============================================================================

      startScanning: () => {
        set({
          scanState: {
            ...get().scanState,
            isScanning: true,
            scanError: null
          }
        })
      },

      stopScanning: () => {
        set({
          scanState: {
            ...get().scanState,
            isScanning: false
          }
        })
      },

      clearScanError: () => {
        set({
          scanState: {
            ...get().scanState,
            scanError: null
          }
        })
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getAttendanceRate: () => {
        const { currentSessionData } = get()
        if (!currentSessionData || currentSessionData.totalStudents === 0) return 0

        return Math.round((currentSessionData.presentCount / currentSessionData.totalStudents) * 100)
      },

      getPresentStudents: () => {
        const { currentSessionData } = get()
        if (!currentSessionData) return []

        return currentSessionData.attendanceRecords.filter(record => record.status === 'PRESENT')
      },

      getAbsentStudents: () => {
        const { currentSessionData } = get()
        if (!currentSessionData) return []

        return currentSessionData.attendanceRecords.filter(record => record.status === 'ABSENT')
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      clearErrors: () => {
        set({
          error: null,
          scanState: {
            ...get().scanState,
            scanError: null
          }
        })
      },

      reset: () => {
        set({
          currentSessionData: null,
          scanState: DEFAULT_QR_SCAN_STATE,
          isLoadingSession: false,
          isMarkingAttendance: false,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'attendance-store',
      partialize: (state) => ({
        // Don't persist attendance data - always fetch fresh for accuracy
        // Attendance data changes frequently and should be current
      })
    }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for session attendance data
 */
export function useSessionAttendance() {
  return useAttendanceStore(state => ({
    sessionData: state.currentSessionData,
    isLoading: state.isLoadingSession,
    attendanceRate: state.getAttendanceRate(),
    presentStudents: state.getPresentStudents(),
    absentStudents: state.getAbsentStudents(),
    loadSession: state.loadSessionAttendance
  }))
}

/**
 * Hook for QR scanning functionality
 */
export function useQRScanner() {
  return useAttendanceStore(state => ({
    isScanning: state.scanState.isScanning,
    lastScanResult: state.scanState.lastScanResult,
    scanError: state.scanState.scanError,
    isMarkingAttendance: state.isMarkingAttendance,
    scanQRCode: state.scanQRCode,
    startScanning: state.startScanning,
    stopScanning: state.stopScanning,
    clearScanError: state.clearScanError
  }))
}

/**
 * Hook for manual attendance actions
 */
export function useAttendanceActions() {
  return useAttendanceStore(state => ({
    isMarkingAttendance: state.isMarkingAttendance,
    markManual: state.markManualAttendance,
    bulkMarkAbsent: state.bulkMarkAbsent,
    error: state.error,
    clearErrors: state.clearErrors
  }))
}