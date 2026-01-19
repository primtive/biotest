import prisma from "@/data/prisma";
import { JsonObject } from "@prisma/client/runtime/library";

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    include: { topicGroup: true },
    orderBy: [{ isArchive: "asc" }, { admin: "desc" }],
  });
  return users;
};

export const getUserLastTest = async (userId: string) => {
  const test = await prisma.test.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return test;
};

export const getLeaderboard: (topicGroupId: string) => Promise<any> = async (
  topicGroupId: string,
) => {
  const users = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $match: {
          admin: false,
          topicGroupId: { $oid: topicGroupId },
          isArchive: false,
        },
      },
      {
        $sort: { score: -1 },
      },
    ],
  });
  return users || [];
};

export const updateTopicProgress = async (userId: string, topicId: string) => {
  // 1. Get total active tasks available for this topic
  const totalTasksCount = await prisma.task.count({
    where: {
      topicId,
      active: true,
    },
  });

  if (totalTasksCount === 0) return;

  // 2. Get all completed tests for this user that include this topic
  // We fetch the 'answers' array from each test
  const userTests = await prisma.test.findMany({
    where: {
      userId,
      isComplete: true,
    },
    select: {
      answers: true, // This is the array of { taskId, answer, correct }
    },
  });

  // 3. Identify unique tasks answered correctly
  // We use a Set to ensure we don't double-count if a user took multiple tests with the same task
  const correctTaskIds = new Set<string>();

  for (const test of userTests) {
    for (const ans of test.answers) {
      if (ans.correct) {
        const task = await prisma.task.findUnique({
          where: { id: ans.taskId },
        });
        if (task?.topicId && task!.topicId == topicId) {
          correctTaskIds.add(ans.taskId);
        }
      }
    }
  }

  // 4. Calculate Percentage
  const percentage = Math.round((correctTaskIds.size / totalTasksCount) * 100);

  // 5. Upsert the progress record
  await prisma.userTopicProgress.upsert({
    where: {
      userId_topicId: { userId, topicId },
    },
    update: { percent: percentage, correctTaskIds: [...correctTaskIds] },
    create: {
      userId,
      topicId,
      correctTaskIds: [...correctTaskIds],
      percent: percentage,
    },
  });
};

/**
 * Returns a dictionary of topic percentages for a specific user.
 * Format: { [topicId: string]: number }
 */
export async function getUserTopicPercentages(userId: string) {
  const progressRecords = await prisma.userTopicProgress.findMany({
    where: { userId },
    select: {
      topicId: true,
      percent: true,
    },
  });

  // Convert the array of records into a dictionary
  const progressDict = progressRecords.reduce(
    (acc, record) => {
      acc[record.topicId] = record.percent;
      return acc;
    },
    {} as Record<string, number>,
  );

  return progressDict;
}
