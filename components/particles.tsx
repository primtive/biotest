"use client";
import MouseParticles from "react-mouse-particles";
import { useRealtime } from "@/contexts/RealtimeContext";

export default function Particles() {
  const { isEnabled } = useRealtime();
  return <>
    {
      isEnabled && <MouseParticles
        g={1}
        v={1}
        alpha={1}
        color={["#ffffff", "#FF69B4", "#fff9bf", "#fa99ff"]}
        level={6}
      />
    }
  </>
}