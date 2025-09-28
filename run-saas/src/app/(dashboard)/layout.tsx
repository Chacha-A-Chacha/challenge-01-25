// app/(dashboard)/layout.tsx - Dashboard Layout
import { Metadata } from 'next'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export const metadata: Metadata = {
  title: {
    template: '%s | Weekend Academy',
    default: 'Weekend Academy'
  },
  description: 'Student attendance management system for weekend academy'
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardRootLayout({ children }: DashboardLayoutProps) {
  return (
    <SessionProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </SessionProvider>
  )
}
