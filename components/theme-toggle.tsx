"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { useRealtime } from "@/contexts/RealtimeContext"

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, theme } = useTheme()
  const { isEnabled } = useRealtime();

  return (
    theme === "pink" ? null :
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ?
        <Sun className="h-5 w-5" />
        :
        <Moon className="h-5 w-5" />
      }
    </Button>
  )
}