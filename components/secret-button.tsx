"use client";
import { Button } from "./ui/button";
import { useRealtime } from "@/contexts/RealtimeContext";

export default function SecretButton() {

  const { isEnabled, toggle } = useRealtime();

  return (
    <div className="space-y-2">
      <h1>Великая переключалка пикми-темы</h1>
      <Button
        onClick={toggle}
        variant={isEnabled ? "outline" : "default"}
        className="px-4 py-2 transition duration-150 ease-in-out"
      >
        {isEnabled ? "Отключить" : "Включить"}
      </Button>
    </div>
  );
}
