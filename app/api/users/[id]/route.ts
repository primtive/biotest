import { ObjectId } from 'mongodb';
import { getMongoDb, getMongoClient } from '@/data/mongo';
import { z } from 'zod';
import prisma from '@/data/prisma';
import { getApiUser, apiError, parseId, idSchema, readJson, HttpError } from '@/lib/server/access';
import { invalidateStatistics } from '@/data/statistics';
const input = z.object({ id: idSchema.optional(), name: z.string().trim().min(1).max(160), username: z.string().trim().min(1).max(128), topicGroupId: idSchema, group: z.string().trim().max(160).default(''), isArchive: z.boolean().default(false) }).strict();
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getApiUser(request, true); const routeId = (await props.params).id;
    const body = input.parse(await readJson(request));
    const id = routeId === 'new' ? undefined : parseId(routeId);
    if (body.id && body.id !== id) throw new HttpError(400, 'Идентификаторы не совпадают');
    if (!await prisma.topicGroup.findUnique({ where: { id: body.topicGroupId }, select: { id: true } })) throw new HttpError(400, 'Группа заданий не найдена');
    if (await prisma.user.findFirst({ where: { username: body.username, ...(id ? { id: { not: id } } : {}) }, select: { id: true } })) throw new HttpError(409, 'Логин уже занят');
    const existing = id ? await prisma.user.findUnique({ where: { id }, select: { admin: true } }) : null;
    if (id && !existing) throw new HttpError(404, 'Пользователь не найден');
    if (body.isArchive && (actor.id === id || existing?.admin)) throw new HttpError(409, 'Административный аккаунт нельзя архивировать здесь');
    const { id: _id, ...data } = body;
    const db = await getMongoDb();
    await db.createCollection('UsernameReservation').catch((error: any) => { if (error.code !== 48) throw error; });
    const uid = id ? new ObjectId(id) : new ObjectId();
    const session = (await getMongoClient()).startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection<{_id: string; ownerId: ObjectId}>('UsernameReservation').updateOne({ _id: body.username, ownerId: uid }, { $setOnInsert: { ownerId: uid } }, { upsert: true, session });
        const duplicate = await db.collection('User').findOne({ username: body.username, _id: { $ne: uid } }, { session });
        if (duplicate) throw new HttpError(409, 'Логин уже занят');
        if (id) {
          const updated = await db.collection('User').updateOne({ _id: uid }, { $set: { ...data, topicGroupId: new ObjectId(data.topicGroupId) } }, { session });
          if (!updated.matchedCount) throw new HttpError(404, 'Пользователь не найден');
          await db.collection<{_id: string; ownerId: ObjectId}>('UsernameReservation').deleteMany({ ownerId: uid, _id: { $ne: body.username } }, { session });
        } else {
          await db.collection('User').insertOne({ _id: uid, ...data, topicGroupId: new ObjectId(data.topicGroupId), admin: false, createdAt: new Date(), lastAccess: new Date(), scores: [], score: 0, testsCount: 0, percent: 0 }, { session });
        }
      });
    } finally { await session.endSession(); }
    await invalidateStatistics(String(uid)); return Response.json({ ok: true, id: String(uid) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getApiUser(request, true); const id = parseId((await props.params).id);
    const user = await prisma.user.findUnique({ where: { id }, select: { admin: true } });
    if (!user) throw new HttpError(404, 'Пользователь не найден');
    if (id === actor.id || user.admin) throw new HttpError(409, 'Административный аккаунт нельзя архивировать здесь');
    await prisma.user.update({ where: { id }, data: { isArchive: true } });
    await invalidateStatistics(id); return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
