import prisma from '@/data/prisma';
import { getApiUser, apiError, parseId, HttpError } from '@/lib/server/access';
import { invalidateStatistics } from '@/data/statistics';
import { getMongoDb } from '@/data/mongo';
import { ObjectId, type Document } from 'mongodb';
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request); const id = parseId((await props.params).id);
    if (!user.admin && !await prisma.test.findFirst({ where: { userId: user.id, tasksIds: { has: id } }, select: { id: true } })) throw new HttpError(404, 'Задание не найдено');
    const db = await getMongoDb();
    const result = await db.collection('Task').updateOne({ _id: new ObjectId(id) }, {
      $set: { isReported: true }, $addToSet: { reportedByIds: new ObjectId(user.id) },
    } as Document);
    if (!result.matchedCount) throw new HttpError(404, 'Задание не найдено');
    await invalidateStatistics(); return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
