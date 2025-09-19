// hooks/teacher/useAttendance.ts
import { useState, useCallback } from 'react'
import { useApiQuery, useApiMutation } from '@/hooks/api'
import { useNotifications } from '@/hooks/ui'
import { useOfflineStore } from '@/store'
import { API_ROUTES } from '@/lib/constants'
import { validateQRData } from '@/lib/utils'
import type { AttendanceRecord, AttendanceStats } from '@/types'

/**
 * Attendance marking and management
 */
export function useAttendance(sessionId?: string) {
  const [selectedSession, setSelectedSession] = useState<string | null>(sessionId || null)
  const { showSuccess, showError } = useNotifications()
  const { addPendingAttendance, isOnline } = useOfflineStore()

  // Fetch attendance for session
  const {
    data: attendanceData,
    isLoading,
    error,
    refetch
  } = useApiQuery<{
    attendance: AttendanceRecord[]
    stats: AttendanceStats
  }>(
    ['attendance', selectedSession],
    selectedSession ? API_ROUTES.ATTENDANCE_BY_SESSION(selectedSession) : '',
    {
      enabled: !!selectedSession,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: isOnline ? 60 * 1000 : undefined // Refresh every minute when online
    }
  )

  // QR scan mutation
  const scanAttendanceMutation = useApiMutation(
    async ({ qrData, sessionId }: { qrData: string; sessionId: string }) => {
      const response = await fetch(API_ROUTES.ATTENDANCE_SCAN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData, sessionId })
      })
      return await response.json()
    },
    {
      onSuccess: (result) => {
        const statusMessages = {
          'PRESENT': 'Attendance marked successfully',
          'WRONG_SESSION': 'Student scanned in wrong session',
          'ABSENT': 'Student marked absent'
        }
        
        const message = statusMessages[result.status] || 'Attendance processed'
        const type = result.status === 'PRESENT' ? 'success' : 'warning'
        
        if (type === 'success') {
          showSuccess('Attendance Marked', message)
        } else {
          showError('Wrong Session', message)
        }
        
        refetch()
      },
      onError: (error) => showError('Scan Failed', error)
    }
  )

  // Manual attendance mutation
  const manualAttendanceMutation = useApiMutation(
    async ({ 
      studentId, 
      sessionId, 
      status 
    }: { 
      studentId: string
      sessionId: string
      status: 'PRESENT' | 'ABSENT' 
    }) => {
      const response = await fetch(API_ROUTES.ATTENDANCE_MANUAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, sessionId, status })
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Attendance Updated', 'Manual attendance recorded')
        refetch()
      },
      onError: (error) => showError('Manual Attendance Failed', error)
    }
  )

  // Scan QR code
  const scanQRCode = useCallback(async (qrCodeString: string) => {
    if (!selectedSession) {
      showError('No Session Selected', 'Please select a session first')
      return false
    }

    // Validate QR data format
    const qrData = validateQRData(qrCodeString)
    if (!qrData) {
      showError('Invalid QR Code', 'QR code format is not recognized')
      return false
    }

    // Handle offline scenario
    if (!isOnline) {
      addPendingAttendance({
        studentUuid: qrData.uuid,
        studentNumber: qrData.student_id,
        sessionId: selectedSession,
        timestamp: new Date().toISOString(),
        qrData: qrCodeString
      })
      
      showSuccess('Offline Mode', 'Attendance will sync when connection is restored')
      return true
    }

    try {
      await scanAttendanceMutation.mutate({
        qrData: qrCodeString,
        sessionId: selectedSession
      })
      return true
    } catch (error) {
      return false
    }
  }, [selectedSession, isOnline, addPendingAttendance, scanAttendanceMutation, showSuccess, showError])

  // Mark manual attendance
  const markManualAttendance = useCallback(async (
    studentId: string,
    status: 'PRESENT' | 'ABSENT'
  ) => {
    if (!selectedSession) {
      showError('No Session Selected', 'Please select a session first')
      return false
    }

    try {
      await manualAttendanceMutation.mutate({
        studentId,
        sessionId: selectedSession,
        status
      })
      return true
    } catch (error) {
      return false
    }
  }, [selectedSession, manualAttendanceMutation, showError])

  return {
    // Data
    attendance: attendanceData?.attendance || [],
    stats: attendanceData?.stats || null,
    selectedSession,
    
    // State
    isLoading,
    error,
    
    // Mutations state
    isScanning: scanAttendanceMutation.isLoading,
    isMarkingManual: manualAttendanceMutation.isLoading,
    
    // Actions
    scanQRCode,
    markManualAttendance,
    setSelectedSession,
    refetch
  }
}
