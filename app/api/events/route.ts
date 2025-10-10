// app/api/events/route.ts
import { NextRequest } from "next/server";

let clients: ReadableStreamDefaultController<Uint8Array>[] = [];
let isEnabled = false;

export async function GET() {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ isEnabled })}\n\n`));
      clients.push(controller);
    },
    cancel() {
      clients = clients.filter(c => c !== controllerRef);
    },
  });

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });

  return response;
}

// Helper to send updates
function broadcast(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  for (const c of clients) c.enqueue(encoder.encode(message));
}

// POST-запрос для переключения
export async function POST() {
  isEnabled = !isEnabled;
  broadcast({ isEnabled });
  return new Response(JSON.stringify({ success: true, isEnabled }), {
    headers: { "Content-Type": "application/json" },
  });
}
