import { requireStaff } from '@/lib/server/access';
import { assignedGroups, studentWhere } from '@/lib/permissions';
import prisma from '@/data/prisma';
import UserTable from './users-table';
import { parsePagination, pageInfo, type PageQuery } from '@/lib/pagination';
import { getMongoDb } from '@/data/mongo';
export const metadata = { title: 'Пользователи' };
export default async function UsersPage({ searchParams }: { searchParams: Promise<PageQuery & { name?: string; username?: string; group?: string }> }) {
  const actor = await requireStaff(); const query = await searchParams;
  try {
    const { page, pageSize } = parsePagination(query);
    const where = { AND: [studentWhere(actor), { ...(query.name ? { name: { contains: query.name.slice(0, 160), mode: 'insensitive' as const } } : {}), ...(query.username ? { username: { contains: query.username.slice(0, 128), mode: 'insensitive' as const } } : {}), ...(query.group ? { group: query.group.slice(0, 160) } : {}) }] };
    const [total, groups] = await Promise.all([prisma.user.count({ where }), actor.admin ? (await getMongoDb()).collection('User').distinct('group') : assignedGroups(actor)]);
    const pagination = pageInfo(total, page, pageSize);
    const users = await prisma.user.findMany({ where, skip: (pagination.page - 1) * pageSize, take: pageSize, select: { id: true, name: true, username: true, admin: true, teacher: true, ...(actor.admin ? { teacherGroups: true } : {}), isArchive: true, createdAt: true, group: true, topicGroupId: true, topicGroup: true, testsCount: true, score: true, percent: true }, orderBy: [{ isArchive: 'asc' }, { admin: 'desc' }, { id: 'asc' }] });
    return <UserTable users={users} groups={groups.filter(Boolean).sort()} canManage={actor.admin} pagination={pagination} query={query} />;
  } catch (error) { if (error instanceof RangeError) return <p role="alert">{error.message}</p>; throw error; }
}
