import { z } from 'zod';
import prisma from '@/data/prisma';
import { getApiUser, apiError, parseId, idSchema, readJson, HttpError } from '@/lib/server/access';
import { invalidateStatistics } from '@/data/statistics';
import { editTopic } from '@/lib/server/attempts';
const input = z.object({ id: idSchema.optional(), name: z.string().trim().min(1).max(300), section: z.string().trim().max(300).default(''), topicGroupId: idSchema, active: z.boolean().default(true) }).strict();
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await getApiUser(request, true); const routeId = (await props.params).id; const body = input.parse(await readJson(request));
    const id = routeId === 'new' ? undefined : parseId(routeId);
    if (body.id && body.id !== id) throw new HttpError(400, 'Идентификаторы не совпадают');
    if (!await prisma.topicGroup.findUnique({ where: { id: body.topicGroupId }, select: { id: true } })) throw new HttpError(400, 'Группа не найдена');
    const { id: _id, ...data } = body;
    const topic = id ? await editTopic(id, data) : await prisma.topic.create({ data });
    invalidateStatistics(); return Response.json({ ok: true, id: topic.id });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try { await getApiUser(request, true); await prisma.topic.update({ where: { id: parseId((await props.params).id) }, data: { active: false } }); invalidateStatistics(); return Response.json({ ok: true }); }
  catch (error) { return apiError(error); }
}
