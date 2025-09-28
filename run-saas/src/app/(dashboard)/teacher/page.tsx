// app/(dashboard)/teacher/page.tsx - Teacher Dashboard Page
import { Metadata } from 'next'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard'

export const metadata: Metadata = {
  title: 'Teacher Dashboard | Weekend Academy',
  description: 'Class management and attendance tracking'
}

export default function TeacherPage() {
  return (
    <RoleGuard allowedRoles="teacher">
      <TeacherDashboard />
    </RoleGuard>
  )
}
