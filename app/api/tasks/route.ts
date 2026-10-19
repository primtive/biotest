import { z } from 'zod';
import prisma from '@/data/prisma';
import { getApiUser, apiError, idSchema } from '@/lib/server/access';
import { sanitizeContent } from '@/lib/server/html';
import { pageInfo, parsePagination } from '@/lib/pagination';
export async function GET(request: Request) {
  try {
    await getApiUser(request, true); const params = new URL(request.url).searchParams;
    const { page, pageSize } = parsePagination({ page: params.get('page') || undefined, pageSize: params.get('pageSize') || undefined });
    const topics = params.get('topics') ? z.array(idSchema).max(100).parse(params.get('topics')!.split(',')) : [];
    const sources = z.array(z.string().max(300)).max(100).parse(params.get('sources')?.split(',').filter(Boolean) || []);
    const line = z.string().max(100).parse(params.get('line') || '');
    const where = { ...(topics.length ? { topicId: { in: topics } } : {}), ...(sources.length ? { source: { in: sources } } : {}), ...(line ? { line: { contains: line } } : {}) };
    const total = await prisma.task.count({ where });
    const pagination = pageInfo(total, page, pageSize);
    const items = await prisma.task.findMany({ where, skip: (pagination.page - 1) * pageSize, take: pageSize, orderBy: [{ isReported: 'desc' }, { id: 'asc' }], select: { id: true, topicId: true, topic: { select: { id: true, name: true } }, html: true, answer: true, line: true, source: true, explanation: true, disordered: true, isReported: true, active: true } });
    return Response.json({ items: items.map(t => ({ ...t, html: sanitizeContent(t.html), explanation: sanitizeContent(t.explanation) })), ...pagination });
  } catch (error) { return apiError(error); }
}
