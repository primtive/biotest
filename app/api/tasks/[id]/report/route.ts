import prisma from '@/data/prisma';
import { getApiUser, apiError, parseId, HttpError } from '@/lib/server/access';
import { invalidateStatistics } from '@/data/statistics';
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request); const id = parseId((await props.params).id);
    if (!user.admin && !await prisma.test.findFirst({ where: { userId: user.id, tasksIds: { has: id } }, select: { id: true } })) throw new HttpError(404, 'Задание не найдено');
    await prisma.task.update({ where: { id }, data: { isReported: true } }); await invalidateStatistics(); return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
