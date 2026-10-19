import "server-only";
import prisma from "@/data/prisma";
import { unstable_cache, revalidateTag } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/server/access";
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
export async function getStatisticsPeriods() { return statisticsPeriods(await getMongoDb()); }
export async function getWeeklyStatistics(userId: string, filter: StatisticsFilter = {}) {
  const user = await requireUser();
  if (user.id !== userId && !user.admin) throw new Error('Forbidden');
  return (await readStatistics(await getMongoDb(), filter.period, userId, selectedTopicGroup(filter.topicGroup))).weeks;
}
export async function getAdminStatistics(filter: StatisticsFilter = {}) {
  await requireAdmin();
  return readStatistics(await getMongoDb(), filter.period, undefined, selectedTopicGroup(filter.topicGroup));
}
const dateFilter = (field: string, start: Date, end: Date) => ({ [field]: { $gte: { $date: start.toISOString() }, $lt: { $date: end.toISOString() } } });
const correctExpression = { $size: { $filter: { input: "$uniqueAnswers", as: "answer", cond: { $eq: ["$$answer.correct", true] } } } };

// Call only after the reports API has checked the administrator session.
export const getReportStatistics = unstable_cache(async (from: string, to: string, topicGroup: string, completedOnly: boolean) => {
  const range = statisticsRange(from, to);
  const selectedGroupId = selectedTopicGroup(topicGroup);
  const groupMatch = selectedGroupId ? { topicGroupId: { $oid: selectedGroupId } } : {};
  return prisma.user.aggregateRaw({ pipeline: [
    { $match: { ...groupMatch, isArchive: false, admin: false } },
    { $lookup: { from: "Test", let: { userId: "$_id" }, pipeline: [
      { $match: { ...groupMatch, ...(completedOnly ? { isComplete: true } : {}), ...dateFilter(completedOnly ? "completedAt" : "createdAt", range.start, range.end), $expr: { $eq: ["$userId", "$$userId"] } } },
      { $set: { uniqueAnswers: uniqueAnswersExpression } },
      { $group: { _id: null, testCount: { $sum: 1 }, score: { $sum: correctExpression } } },
      { $project: { _id: 0, testCount: 1, score: 1 } },
    ], as: "summary" } },
    { $project: { _id: 1, name: 1, username: 1, topicGroupId: 1, testCount: { $ifNull: [{ $first: "$summary.testCount" }, 0] }, score: { $ifNull: [{ $first: "$summary.score" }, 0] } } },
    { $sort: { testCount: -1, name: 1, _id: 1 } },
  ] });
}, ["report-statistics-v3"], { revalidate: 60, tags: ["statistics"] });
