import { requireAdmin } from '@/lib/server/access';
import prisma from '@/data/prisma';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/data/mongo';
import TopicsTable from './topics-table';
import { parsePagination, pageInfo, type PageQuery } from '@/lib/pagination';
export const metadata = { title: 'Темы' };
export default async function TopicsPage({ searchParams }: { searchParams: Promise<PageQuery & { q?: string }> }) {
  await requireAdmin(); const query = await searchParams;
  try {
    const { page, pageSize } = parsePagination(query);
    const where = query.q ? { name: { contains: query.q.slice(0, 160), mode: 'insensitive' as const } } : {};
    const total = await prisma.topic.count({ where }), pagination = pageInfo(total, page, pageSize);
    const topics = await prisma.topic.findMany({ where, skip: (pagination.page - 1) * pageSize, take: pageSize, orderBy: [{ name: 'asc' }, { id: 'asc' }], include: { topicGroup: true } });
    const counts = await (await getMongoDb()).collection('Task').aggregate([{ $match: { topicId: { $in: topics.map(t => new ObjectId(t.id)) } } }, { $group: { _id: '$topicId', count: { $sum: 1 } } }]).toArray();
    return <TopicsTable initTopics={topics.map(topic => ({ ...topic, count: counts.find(c => String(c._id) === topic.id)?.count || 0 }))} pagination={pagination} query={query.q || ''} />;
  } catch (error) { if (error instanceof RangeError) return <p role="alert">{error.message}</p>; throw error; }
}
