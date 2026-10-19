import 'server-only';
import { requireUser } from '@/lib/server/access';
import { createAttempt } from '@/lib/server/attempts';
export async function newRandomTest(userId: string) {
  const user = await requireUser(); if (user.id !== userId) throw new Error('Forbidden');
  return createAttempt(user);
}
export async function newTestWithTopics(topicIds: string[], userId: string) {
  const user = await requireUser(); if (user.id !== userId) throw new Error('Forbidden');
  return createAttempt(user, topicIds);
}
