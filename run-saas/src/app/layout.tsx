// app/layout.tsx - Root layout with providers
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { Toaster } from '@/components/ui/sonner'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Weekend Academy',
    default: 'Weekend Academy - Student Attendance System'
  },
  description: 'Modern student attendance management system for weekend academies',
  keywords: ['attendance', 'education', 'QR code', 'student management'],
  authors: [{ name: 'Weekend Academy' }],
  robots: 'noindex, nofollow', // Private system
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
