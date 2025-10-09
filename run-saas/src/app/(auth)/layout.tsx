// app/(auth)/layout.tsx
import { SessionProvider } from '@/components/auth/SessionProvider'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </SessionProvider>
  )
}