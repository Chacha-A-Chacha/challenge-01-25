// components/auth/SessionProvider.tsx
"use client"

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useAuthStore } from "@/store/auth/auth-store"

interface SessionProviderProps {
  children: React.ReactNode
}

function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const syncSession = useAuthStore(state => state.syncSession)

  useEffect(() => {
    syncSession(session)
  }, [session, syncSession])

  return <>{children}</>
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <SessionSync>
        {children}
      </SessionSync>
    </NextAuthSessionProvider>
  )
}
