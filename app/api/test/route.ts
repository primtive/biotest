import { z } from 'zod';
import { getApiUser, apiError, idSchema, readJson } from '@/lib/server/access';
import { createAttempt } from '@/lib/server/attempts';
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    const body = z.object({ topicIds: z.array(idSchema).min(1).max(100).optional() }).strict().parse(await readJson(request));
    const id = await createAttempt(user, body.topicIds);
    return Response.json({ id, url: `/t/${id}` });
  } catch (error) { return apiError(error); }
}
export function GET() { return Response.json({ message: 'Используйте POST' }, { status: 405, headers: { Allow: 'POST' } }); }
