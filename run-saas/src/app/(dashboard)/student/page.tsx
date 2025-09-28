// app/(dashboard)/student/page.tsx - Student Dashboard Page
import { Metadata } from 'next'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { StudentDashboard } from '@/components/student/StudentDashboard'

export const metadata: Metadata = {
  title: 'Student Portal | Weekend Academy',
  description: 'View your attendance and generate QR codes'
}

export default function StudentPage() {
  return (
    <RoleGuard allowedRoles="student">
      <StudentDashboard />
    </RoleGuard>
  )
}