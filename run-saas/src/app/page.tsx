// app/page.tsx - Root page with smart redirect
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function RootPage() {
  const user = await getCurrentUser()

  if (user) {
    // Redirect authenticated users to their dashboard
    switch (user.role) {
      case 'admin':
        redirect('/admin')
      case 'teacher':
        redirect('/teacher')
      case 'student':
        redirect('/student')
      default:
        redirect('/login')
    }
  }

  // Redirect unauthenticated users to student login (default)
  redirect('/login')
}
