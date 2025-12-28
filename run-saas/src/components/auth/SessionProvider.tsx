// components/auth/SessionProvider.tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth/auth-store";

interface SessionProviderProps {
  children: React.ReactNode;
}

function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const syncSession = useAuthStore((state) => state.syncSession);
  const setSessionStatus = useAuthStore((state) => state.setSessionStatus);

  useEffect(() => {
    // Sync NextAuth status to Zustand store
    if (status === "loading") {
      setSessionStatus("loading");
    } else if (status === "authenticated" && session) {
      syncSession(session);
    } else if (status === "unauthenticated") {
      setSessionStatus("unauthenticated");
    }
  }, [status, session, syncSession, setSessionStatus]);

  return <>{children}</>;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <SessionSync>{children}</SessionSync>
    </NextAuthSessionProvider>
  );
}
