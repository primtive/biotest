"use client";

import { useTheme } from "next-themes";
import React, { createContext, useContext, useEffect, useState } from "react";

type RealtimeContextType = {
  isEnabled: boolean;
  toggle: () => Promise<void>;
};

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const { setTheme, systemTheme } = useTheme();

  // Подключение к SSE
  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.isEnabled === "boolean") {
          setIsEnabled(data.isEnabled);
          if (data.isEnabled) {
            setTheme("pink");
          } else {
            setTheme("light");
          }
        }
      } catch (err) {
        console.error("Invalid SSE message:", err);
      }
    };

    source.onerror = (err) => {
      console.warn("SSE connection error:", err);
    };

    return () => {
      source.close();
    };
  }, []);

  const toggle = async () => {
    await fetch("/api/events", { method: "POST" });
  };

  return (
    <RealtimeContext.Provider value={{ isEnabled, toggle }}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Хук для удобного доступа к контексту
export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within <RealtimeProvider>");
  return ctx;
}
