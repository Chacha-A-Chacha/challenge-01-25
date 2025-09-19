// hooks/admin/useSystemStats.ts
import { useApiQuery } from '@/hooks/api'
import { API_ROUTES } from '@/lib/constants'
import { usePermissions } from '@/hooks/auth'

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
    lastBackup: string
    diskUsage: number
  }
}

/**
 * Dashboard statistics and analytics
 */
export function useSystemStats() {
  const { canManageSystem } = usePermissions()

  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useApiQuery<SystemStats>(
    'system-stats',
    '/api/admin/stats',
    {
      enabled: canManageSystem,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000 // Refresh every minute
    }
  )

  // Calculate trends and insights
  const insights = stats ? {
    // Course insights
    courseUtilization: stats.courses.active / stats.courses.total,
    averageStudentsPerCourse: stats.students.total / stats.courses.active,
    
    // Teacher insights
    teacherToStudentRatio: stats.students.total / stats.teachers.total,
    headTeacherPercentage: stats.teachers.headTeachers / stats.teachers.total,
    
    // Attendance insights
    overallAttendanceRate: stats.attendance.weeklyAttendanceRate,
    attendanceToday: stats.attendance.todayAttendance,
    
    // System health
    systemHealthScore: calculateHealthScore(stats),
    
    // Reassignment insights
    reassignmentPendingRate: stats.reassignments.pending / 
      (stats.reassignments.pending + stats.reassignments.approved + stats.reassignments.denied)
  } : null

  return {
    // Data
    stats,
    insights,
    
    // State
    isLoading,
    error,
    
    // Actions
    refresh: refetch,
    
    // Computed values
    isHealthy: insights?.systemHealthScore && insights.systemHealthScore > 0.8,
    needsAttention: insights?.systemHealthScore && insights.systemHealthScore < 0.6
  }
}

// Helper function for system health calculation
function calculateHealthScore(stats: SystemStats): number {
  let score = 0
  let factors = 0

  // Database connectivity (critical)
  if (stats.systemHealth.databaseConnected) {
    score += 0.4
  }
  factors++

  // Attendance rate (important)
  if (stats.attendance.weeklyAttendanceRate > 0.8) {
    score += 0.3
  } else if (stats.attendance.weeklyAttendanceRate > 0.6) {
    score += 0.15
  }
  factors++

  // Active courses ratio (moderate)
  const activeRatio = stats.courses.active / stats.courses.total
  if (activeRatio > 0.7) {
    score += 0.2
  } else if (activeRatio > 0.4) {
    score += 0.1
  }
  factors++

  // Disk usage (minor)
  if (stats.systemHealth.diskUsage < 0.8) {
    score += 0.1
  } else if (stats.systemHealth.diskUsage < 0.9) {
    score += 0.05
  }
  factors++

  return score
}
