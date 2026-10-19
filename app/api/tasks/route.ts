import { z } from 'zod';
import prisma from '@/data/prisma';
import { getApiUser, apiError, idSchema } from '@/lib/server/access';
import { sanitizeContent } from '@/lib/server/html';
export async function GET(request: Request) {
  try {
    await getApiUser(request, true); const params = new URL(request.url).searchParams;
    const page = z.coerce.number().int().min(1).max(100000).parse(params.get('page') || 1);
    const topics = params.get('topics') ? z.array(idSchema).max(100).parse(params.get('topics')!.split(',')) : [];
    const sources = z.array(z.string().max(300)).max(100).parse(params.get('sources')?.split(',').filter(Boolean) || []);
    const line = z.string().max(100).parse(params.get('line') || '');
    const where = { ...(topics.length ? { topicId: { in: topics } } : {}), ...(sources.length ? { source: { in: sources } } : {}), ...(line ? { line: { contains: line } } : {}) };
    const [items, total] = await Promise.all([prisma.task.findMany({ where, skip: (page - 1) * 20, take: 20, orderBy: [{ isReported: 'desc' }, { id: 'asc' }], include: { topic: true } }), prisma.task.count({ where })]);
    return Response.json({ items: items.map(t => ({ ...t, html: sanitizeContent(t.html), explanation: sanitizeContent(t.explanation) })), total, totalPages: Math.max(1, Math.ceil(total / 20)) });
  } catch (error) { return apiError(error); }
}
