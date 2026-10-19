import "server-only";
import prisma from "@/data/prisma";
import { unstable_cache, revalidateTag } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/server/access";
import { statisticsRange, STATISTICS_TIMEZONE, uniqueAnswersExpression, weekKeys } from "./statistics-utils";
import { topicGroupIds } from "./topicGroups";

export type StatisticsFilter = { from?: string; to?: string; topicGroup?: string };
export type WeekStatistics = { weekDate: string; count: number; countCompleted: number; score: number };
type WeeklyRaw = { started: { _id: string; count: number }[]; completed: { _id: string; count: number; score: number; answers: number }[] };

export function invalidateStatistics(_userId?: string) {
  revalidateTag("statistics");
}

export function selectedTopicGroup(value = "all") {
  if (!["all", "oge", "ege"].includes(value)) throw new RangeError("Неизвестная группа заданий");
  return value === "all" ? undefined : topicGroupIds[value === "oge" ? "ОГЭ" : "ЕГЭ"];
}

const dateFilter = (field: string, start: Date, end: Date) => ({
  [field]: { $gte: { $date: start.toISOString() }, $lt: { $date: end.toISOString() } },
});
const weekExpression = (field: string) => ({
  $dateToString: { format: "%Y-%m-%d", date: { $subtract: [field, { $multiply: [{ $subtract: [{ $isoDayOfWeek: { date: field, timezone: STATISTICS_TIMEZONE } }, 1] }, 86400000] }] }, timezone: STATISTICS_TIMEZONE },
});
const correctExpression = { $size: { $filter: { input: "$uniqueAnswers", as: "answer", cond: { $eq: ["$$answer.correct", true] } } } };

const cachedWeeklyStatistics = unstable_cache(async (from: string, to: string, userId?: string, topicGroupId?: string) => {
  const range = statisticsRange(from, to);
  const match = { ...(userId ? { userId: { $oid: userId } } : {}), ...(topicGroupId ? { topicGroupId: { $oid: topicGroupId } } : {}) };
  const result = await prisma.test.aggregateRaw({ pipeline: [
    { $match: { ...match, $or: [dateFilter("createdAt", range.start, range.end), { ...dateFilter("completedAt", range.start, range.end), isComplete: true }] } },
    { $facet: {
      started: [{ $match: dateFilter("createdAt", range.start, range.end) }, { $group: { _id: weekExpression("$createdAt"), count: { $sum: 1 } } }],
      completed: [
        { $match: { ...dateFilter("completedAt", range.start, range.end), isComplete: true } },
        { $set: { uniqueAnswers: uniqueAnswersExpression } },
        { $group: { _id: weekExpression("$completedAt"), count: { $sum: 1 }, score: { $sum: correctExpression }, answers: { $sum: { $size: "$uniqueAnswers" } } } },
      ],
    } },
  ] }) as unknown as WeeklyRaw[];
  const raw = result[0] || { started: [], completed: [] };
  return weekKeys(range).map(key => {
    const completed = raw.completed.find(row => row._id === key);
    return { weekDate: key.split("-").reverse().join("."), count: raw.started.find(row => row._id === key)?.count || 0, countCompleted: completed?.count || 0, score: completed ? Math.round(completed.score / completed.count * 100) / 100 : 0 };
  });
}, ["weekly-statistics-v3"], { revalidate: 60, tags: ["statistics"] });

export async function getWeeklyStatistics(userId: string, filter: StatisticsFilter = {}) {
  const user = await requireUser();
  if (user.id !== userId && !user.admin) throw new Error("Forbidden");
  const range = statisticsRange(filter.from, filter.to);
  return cachedWeeklyStatistics(range.from, range.to, userId, selectedTopicGroup(filter.topicGroup));
}

const cachedAdminStatistics = unstable_cache(async (from: string, to: string, topicGroupId?: string) => {
  const range = statisticsRange(from, to);
  const group = topicGroupId ? { topicGroupId } : {};
  const match = topicGroupId ? { topicGroupId: { $oid: topicGroupId } } : {};
  const [userCount, taskCount, startedCount, completed, weeks] = await Promise.all([
    prisma.user.count({ where: { ...group, admin: false, isArchive: false } }),
    prisma.task.count({ where: { active: true, isReported: false, topic: { active: true, ...group } } }),
    prisma.test.count({ where: { ...group, createdAt: { gte: range.start, lt: range.end } } }),
    prisma.test.aggregateRaw({ pipeline: [
      { $match: { ...match, isComplete: true, ...dateFilter("completedAt", range.start, range.end) } },
      { $set: { uniqueAnswers: uniqueAnswersExpression } },
      { $group: { _id: null, completedCount: { $sum: 1 }, answeredCount: { $sum: { $size: "$uniqueAnswers" } }, correctCount: { $sum: correctExpression }, users: { $addToSet: "$userId" } } },
      { $project: { _id: 0, completedCount: 1, answeredCount: 1, correctCount: 1, activeUsers: { $size: "$users" } } },
    ] }),
    cachedWeeklyStatistics(from, to, undefined, topicGroupId),
  ]);
  const counts = (completed as unknown as { completedCount: number; answeredCount: number; correctCount: number; activeUsers: number }[])[0];
  return { userCount, taskCount, startedCount, weeks, completedCount: counts?.completedCount || 0, answeredCount: counts?.answeredCount || 0, correctCount: counts?.correctCount || 0, activeUsers: counts?.activeUsers || 0, accuracy: counts?.answeredCount ? Math.round(counts.correctCount / counts.answeredCount * 100) : 0 };
}, ["admin-statistics-v3"], { revalidate: 60, tags: ["statistics"] });

export async function getAdminStatistics(filter: StatisticsFilter = {}) {
  await requireAdmin();
  const range = statisticsRange(filter.from, filter.to);
  return cachedAdminStatistics(range.from, range.to, selectedTopicGroup(filter.topicGroup));
}

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
