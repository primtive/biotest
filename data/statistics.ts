import "server-only";
import prisma from "@/data/prisma";
import { unstable_cache, revalidateTag } from "next/cache";
import { requireStaff, requireStudentAccess, requireUser, supervisedStudentIds } from "@/lib/server/access";
import { assignedGroups, isTeacher, studentMatch } from '@/lib/permissions';
import { statisticsRange, uniqueAnswersExpression } from "./statistics-utils";
import { topicGroupIds } from "./topicGroups";
import { getMongoDb } from './mongo';
import { readStatistics, bumpStatisticsRevision, statisticsPeriods } from '@/lib/statistics-cache';
export type StatisticsFilter = { period?: string; topicGroup?: string };
export async function invalidateStatistics(_userId?: string) {
  revalidateTag('statistics');
  await bumpStatisticsRevision(await getMongoDb());
}
export function selectedTopicGroup(value = 'all') {
  if (!['all', 'oge', 'ege'].includes(value)) throw new RangeError('Неизвестная группа заданий');
  return value === 'all' ? undefined : topicGroupIds[value === 'oge' ? 'ОГЭ' : 'ЕГЭ'];
}
export async function getStatisticsPeriods() {
  const user = await requireUser();
  const ids = isTeacher(user) ? await supervisedStudentIds(user) : user.admin ? undefined : [user.id];
  return statisticsPeriods(await getMongoDb(), ids);
}
export async function getWeeklyStatistics(userId: string, filter: StatisticsFilter = {}) {
  await requireStudentAccess(userId);
  return (await readStatistics(await getMongoDb(), filter.period, userId, selectedTopicGroup(filter.topicGroup))).weeks;
}
export async function getAdminStatistics(filter: StatisticsFilter = {}) {
  const user = await requireStaff();
  return readStatistics(await getMongoDb(), filter.period, undefined, selectedTopicGroup(filter.topicGroup), isTeacher(user) ? assignedGroups(user) : undefined);
}
const dateFilter = (field: string, start: Date, end: Date) => ({ [field]: { $gte: { $date: start.toISOString() }, $lt: { $date: end.toISOString() } } });
const correctExpression = { $size: { $filter: { input: "$uniqueAnswers", as: "answer", cond: { $eq: ["$$answer.correct", true] } } } };

export async function getReportStatistics(from: string, to: string, topicGroup: string, completedOnly: boolean) {
  const user = await requireStaff();
  return cachedReportStatistics(from, to, topicGroup, completedOnly, isTeacher(user) ? assignedGroups(user) : undefined);
}
const cachedReportStatistics = unstable_cache(async (from: string, to: string, topicGroup: string, completedOnly: boolean, groups?: string[]) => {
  const range = statisticsRange(from, to);
  const selectedGroupId = selectedTopicGroup(topicGroup);
  const groupMatch = selectedGroupId ? { topicGroupId: { $oid: selectedGroupId } } : {};
  return prisma.user.aggregateRaw({ pipeline: [
    { $match: { ...groupMatch, isArchive: false, admin: false, teacher: { $ne: true }, ...(groups === undefined ? {} : studentMatch(groups)) } },
    { $lookup: { from: "Test", let: { userId: "$_id" }, pipeline: [
      { $match: { ...groupMatch, ...(completedOnly ? { isComplete: true } : {}), ...dateFilter(completedOnly ? "completedAt" : "createdAt", range.start, range.end), $expr: { $eq: ["$userId", "$$userId"] } } },
      { $set: { uniqueAnswers: uniqueAnswersExpression } },
      { $group: { _id: null, testCount: { $sum: 1 }, score: { $sum: correctExpression } } },
      { $project: { _id: 0, testCount: 1, score: 1 } },
    ], as: "summary" } },
    { $project: { _id: 1, name: 1, username: 1, topicGroupId: 1, testCount: { $ifNull: [{ $first: "$summary.testCount" }, 0] }, score: { $ifNull: [{ $first: "$summary.score" }, 0] } } },
    { $sort: { testCount: -1, name: 1, _id: 1 } },
  ] });
}, ["report-statistics-v4"], { revalidate: 60, tags: ["statistics"] });
