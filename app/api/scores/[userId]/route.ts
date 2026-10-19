import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getMongoDb, getMongoClient } from '@/data/mongo';
import { getApiUser, apiError, parseId, readJson, HttpError } from '@/lib/server/access';
import { invalidateStatistics } from '@/data/statistics';
export async function POST(request: Request, props: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await getApiUser(request, true); const userId = parseId((await props.params).userId);
    const body = z.object({ score: z.number().int().min(-1000000).max(1000000), requestId: z.string().uuid() }).strict().parse(await readJson(request));
    const db = await getMongoDb(); const session = (await getMongoClient()).startSession();
    try {
      await session.withTransaction(async () => {
        const previous = await db.collection<{ _id: string; userId: ObjectId; score: number }>('ScoreAdjustment').findOne({ _id: body.requestId }, { session });
        if (previous) { if (String(previous.userId) !== userId || previous.score !== body.score) throw new HttpError(409, 'Идентификатор операции уже использован'); return; }
        const user = await db.collection('User').findOne({ _id: new ObjectId(userId) }, { session });
        if (!user) throw new HttpError(404, 'Пользователь не найден');
        if (!Number.isSafeInteger(Number(user.score) + body.score)) throw new HttpError(409, 'Исторический счёт требует проверки перед корректировкой');
        const createdAt = new Date();
        await db.collection<{ _id: string; userId: ObjectId; score: number; actorId: ObjectId; createdAt: Date }>('ScoreAdjustment').insertOne({ _id: body.requestId, userId: new ObjectId(userId), score: body.score, actorId: new ObjectId(actor.id), createdAt }, { session });
        await db.collection('User').updateOne({ _id: user._id }, { $inc: { score: body.score }, $push: { scores: { score: body.score, createdAt, testId: '' } } } as any, { session });
      });
    } finally { await session.endSession(); }
    await invalidateStatistics(userId); return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
