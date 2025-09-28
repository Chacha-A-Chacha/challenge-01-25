// app/(auth)/staff-login/page.tsx - Staff Login Page
import { Metadata } from 'next'
import { AdminTeacherLoginForm } from '@/components/auth/AdminTeacherLoginForm'
import { AuthRedirect } from '@/components/auth/AuthRedirect'

export const metadata: Metadata = {
  title: 'Staff Login | Weekend Academy',
  description: 'Administrator and teacher access portal'
}

export default function StaffLoginPage() {
  return (
    <AuthRedirect>
      <AdminTeacherLoginForm />
    </AuthRedirect>
  )
}
