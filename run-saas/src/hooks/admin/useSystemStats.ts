// hooks/admin/useSystemStats.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth/auth-store'
import { useNotifications } from '@/store/shared/ui-store'
import { fetchWithTimeout, handleApiError } from '@/lib/utils'
import type { ApiResponse } from '@/types'

interface SystemStats {
  courses: {
    total: number
    active: number
    inactive: number
    completed: number
  }
  teachers: {
    total: number
    headTeachers: number
    additionalTeachers: number
  }
  students: {
    total: number
    activeStudents: number
    recentImports: number
  }
  attendance: {
    totalRecords: number
    todayAttendance: number
    weeklyAttendanceRate: number
  }
  reassignments: {
    pending: number
    approved: number
    denied: number
  }
  systemHealth: {
    databaseConnected: boolean
    lastBackup: string | null
    diskUsage: number
  }
}

/**
 * System statistics and health monitoring
 * Direct API calls since this is admin-specific analytics
 */
export function useSystemStats() {
  const { isAdmin } = useAuth()
  const { showError } = useNotifications()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!isAdmin()) {
      setError('Permission denied')
      return
    }

    let isMounted = true

    const fetchStats = async () => {
      if (!isMounted) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchWithTimeout('/api/admin/stats')

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`)
        }

        const result: ApiResponse<SystemStats> = await response.json()

        if (result.success && result.data && isMounted) {
          setStats(result.data)
          setLastUpdated(new Date())
        } else {
          throw new Error(result.error || 'Failed to load system statistics')
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = handleApiError(err).error
          setError(errorMessage)
          showError('Failed to Load Stats', errorMessage)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Initial fetch
    fetchStats()

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchStats, 120000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isAdmin, showError])

  // Calculate system health score
  const healthScore = stats ? calculateHealthScore(stats) : 0
  const isHealthy = healthScore > 0.8
  const needsAttention = healthScore < 0.6

  // Calculate insights and trends
  const insights = stats ? {
    courseUtilization: stats.courses.total > 0 ? stats.courses.active / stats.courses.total : 0,
    averageStudentsPerCourse: stats.courses.active > 0 ? stats.students.total / stats.courses.active : 0,
    teacherToStudentRatio: stats.teachers.total > 0 ? stats.students.total / stats.teachers.total : 0,
    overallAttendanceRate: stats.attendance.weeklyAttendanceRate,
    reassignmentPendingRate: calculateReassignmentRate(stats.reassignments)
  } : null

  return {
    stats,
    insights,
    healthScore,
    lastUpdated,
    isLoading,
    error,
    isHealthy,
    needsAttention,
    refresh: () => {
      if (isAdmin()) {
        setError(null)
        // Trigger re-fetch by updating a dependency
      }
    }
  }
}

// Helper functions
function calculateHealthScore(stats: SystemStats): number {
  let score = 0

  // Database connectivity (40%)
  if (stats.systemHealth.databaseConnected) score += 0.4

  // Attendance rate (30%)
  if (stats.attendance.weeklyAttendanceRate > 0.8) score += 0.3
  else if (stats.attendance.weeklyAttendanceRate > 0.6) score += 0.15

  // Active courses ratio (20%)
  const activeRatio = stats.courses.total > 0 ? stats.courses.active / stats.courses.total : 1
  if (activeRatio > 0.7) score += 0.2
  else if (activeRatio > 0.4) score += 0.1

  // Disk usage (10%)
  if (stats.systemHealth.diskUsage < 0.8) score += 0.1
  else if (stats.systemHealth.diskUsage < 0.9) score += 0.05

  return score
}

function calculateReassignmentRate(reassignments: SystemStats['reassignments']): number {
  const total = reassignments.pending + reassignments.approved + reassignments.denied
  return total > 0 ? reassignments.pending / total : 0
}
