import { getMongoDb } from '@/data/mongo';
import { getApiUser, apiError, secretUserIds, HttpError } from '@/lib/server/access';
export const dynamic = 'force-dynamic';
type State = { _id: string; enabled: boolean };
export async function GET(request: Request) {
  const encoder = new TextEncoder(); let timer: ReturnType<typeof setInterval> | undefined; let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let previous: boolean | undefined; let reading = false;
      const close = () => { if (closed) return; closed = true; if (timer) clearInterval(timer); try { controller.close(); } catch {} };
      request.signal.addEventListener('abort', close, { once: true });
      async function send() {
        if (closed || reading) return; reading = true;
        try { const state = await (await getMongoDb()).collection<State>('AppState').findOne({ _id: 'theme' }); const enabled = state?.enabled ?? false;
          if (!closed) { controller.enqueue(encoder.encode(previous !== enabled ? `data: ${JSON.stringify({ isEnabled: enabled })}\n\n` : ': heartbeat\n\n')); previous = enabled; }
        } catch { close(); } finally { reading = false; }
      }
      void send(); timer = setInterval(() => void send(), 5000);
    },
    cancel() { closed = true; if (timer) clearInterval(timer); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
}
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request); if (!secretUserIds.includes(user.id)) throw new HttpError(403, 'Недостаточно прав');
    const state = await (await getMongoDb()).collection<State>('AppState').findOneAndUpdate({ _id: 'theme' }, [{ $set: { enabled: { $not: [{ $ifNull: ['$enabled', false] }] } } }], { upsert: true, returnDocument: 'after' });
    return Response.json({ success: true, isEnabled: state?.enabled ?? false });
  } catch (error) { return apiError(error); }
}
