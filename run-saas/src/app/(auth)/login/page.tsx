// app/(auth)/login/page.tsx - Student Login Page (Default)
import { Metadata } from 'next'
import { StudentLoginForm } from '@/components/auth/StudentLoginForm'
import { AuthRedirect } from '@/components/auth/AuthRedirect'

export const metadata: Metadata = {
  title: 'Student Login | Weekend Academy',
  description: 'Login to access your attendance and schedule information'
}

export default function StudentLoginPage() {
  return (
    <AuthRedirect>
      <StudentLoginForm />
    </AuthRedirect>
  )
}