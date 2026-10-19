import { z } from 'zod';
import { getApiUser, apiError, parseId, idSchema, readJson, HttpError } from '@/lib/server/access';
import { submitAnswer } from '@/lib/server/attempts';
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request); const id = parseId((await props.params).id);
    const body = z.object({ testId: idSchema, userAnswer: z.string().trim().min(1).max(1000), id: idSchema.optional(), correct: z.unknown().optional() }).strict().parse(await readJson(request));
    if (body.id && body.id !== id) throw new HttpError(400, 'Идентификаторы заданий не совпадают');
    return Response.json({ correct: await submitAnswer(user, body.testId, id, body.userAnswer) });
  } catch (error) { return apiError(error); }
}
