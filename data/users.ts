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
  topicGroupId: string
) => {
  const users = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $match: { admin: false, topicGroupId: { $oid: topicGroupId }, isArchive: false},
      },
      {
        $sort: { score: -1 },
      },
    ],
  });
  return users || [];
};
