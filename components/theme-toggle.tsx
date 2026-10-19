"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    mounted && resolvedTheme === "pink" ? null :
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Переключить тему"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
    >
      {mounted && resolvedTheme === "light" ?
        <Sun className="h-5 w-5" />
        :
        <Moon className="h-5 w-5" />
      }
    </Button>
  )
}
