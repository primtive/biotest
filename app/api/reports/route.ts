import { getApiUser, apiError, HttpError } from '@/lib/server/access';
import { getReportStatistics, selectedTopicGroup } from '@/data/statistics';
import { statisticsRange } from '@/data/statistics-utils';
export async function GET(request: Request) {
  try {
    await getApiUser(request, true); const params = new URL(request.url).searchParams;
    const from = params.get('from'); const to = params.get('to'); const topicGroup = params.get('topicGroup');
    if (!from || !to || !topicGroup) throw new HttpError(400, 'Укажите обе даты и группу');
    const range = statisticsRange(from, to); selectedTopicGroup(topicGroup);
    const completedOnly = params.has('completedOnly') && params.get('completedOnly') !== 'false';
    const data = await getReportStatistics(range.from, range.to, topicGroup, completedOnly);
    return Response.json({ data, from: range.from, to: range.to });
  } catch (error) { return apiError(error); }
}
