"use client"

import { RealtimeProvider } from "@/contexts/RealtimeContext"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"


export default function Providers({ session, children }: { session: Session | null, children: React.ReactNode }) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider themes={['light', 'dark', 'pink']} enableSystem>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}