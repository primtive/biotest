import { z } from 'zod';
import { getApiUser, apiError, HttpError } from '@/lib/server/access';
import { getReportStatistics, selectedTopicGroup } from '@/data/statistics';
import { parsePagination, pageInfo } from '@/lib/pagination';
import { statisticsRange } from '@/data/statistics-utils';
export async function GET(request: Request) {
  try {
    await getApiUser(request, true); const params = new URL(request.url).searchParams;
    const from = params.get('from'); const to = params.get('to'); const topicGroup = params.get('topicGroup');
    if (!from || !to || !topicGroup) throw new HttpError(400, 'Укажите обе даты и группу');
    const range = statisticsRange(from, to); selectedTopicGroup(topicGroup);
    const completedOnly = params.has('completedOnly') && params.get('completedOnly') !== 'false';
    const { page, pageSize } = parsePagination({ page: params.get('page') || undefined, pageSize: params.get('pageSize') || undefined });
    const sort = z.enum(['name', 'username', 'testCount', 'score']).parse(params.get('sort') || 'testCount');
    const direction = z.enum(['asc', 'desc']).parse(params.get('direction') || 'desc');
    const data = await getReportStatistics(range.from, range.to, topicGroup, completedOnly);
    const rows = [...data as unknown as any[]].sort((a, b) => { const result = typeof a[sort] === 'number' ? a[sort] - b[sort] : String(a[sort]).localeCompare(String(b[sort]), 'ru'); return result ? result * (direction === 'asc' ? 1 : -1) : String(a._id?.$oid).localeCompare(String(b._id?.$oid)); }); const pagination = pageInfo(rows.length, page, pageSize);
    return Response.json({ data: rows.slice((pagination.page - 1) * pageSize, pagination.page * pageSize), ...pagination, from: range.from, to: range.to });
  } catch (error) { return apiError(error); }
}
