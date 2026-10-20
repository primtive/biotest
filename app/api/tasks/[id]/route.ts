import { z } from 'zod';
import prisma from '@/data/prisma';
import { getApiUser, apiError, parseId, idSchema, readJson, HttpError } from '@/lib/server/access';
import { sanitizeContent } from '@/lib/server/html';
import { invalidateStatistics } from '@/data/statistics';
import { editTask } from '@/lib/server/attempts';
const input = z.object({ id: idSchema.optional(), topicId: idSchema, html: z.string().min(1).max(200000), answer: z.string().trim().min(1).max(2000), explanation: z.string().max(200000).default(''), line: z.string().max(100).default(''), source: z.string().max(300).default(''), active: z.boolean().default(true), disordered: z.boolean().default(false), isReported: z.boolean().default(false) }).strict();
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request, true); const routeId = (await props.params).id; const body = input.parse(await readJson(request));
    const id = routeId === 'new' ? undefined : parseId(routeId);
    if (body.id && body.id !== id) throw new HttpError(400, 'Идентификаторы не совпадают');
    if (!await prisma.topic.findUnique({ where: { id: body.topicId }, select: { id: true } })) throw new HttpError(400, 'Тема не найдена');
    const { id: _id, ...fields } = body;
    const data = { ...fields, html: sanitizeContent(fields.html), explanation: sanitizeContent(fields.explanation) };
    if (!data.html.trim()) throw new HttpError(400, 'Условие задания пусто после очистки HTML');
    const task = id ? await editTask(id, data, user.id) : await prisma.task.create({ data: { ...data, reportedByIds: data.isReported ? [user.id] : [] } });
    await invalidateStatistics(); return Response.json({ ok: true, id: task.id });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try { await getApiUser(request, true); await prisma.task.update({ where: { id: parseId((await props.params).id) }, data: { active: false } }); await invalidateStatistics(); return Response.json({ ok: true }); }
  catch (error) { return apiError(error); }
}
