import prisma from "@/data/prisma";
import { JsonObject } from "@prisma/client/runtime/library";

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    include: {topicGroup: true}
  })
  return users
}

export const getUserLastTest = async (userId: string) => {
  const test = await prisma.test.findFirst({ where: { userId }, orderBy: {createdAt: 'desc'} })
  return test;
}

export const getLeaderboard: () => Promise<any> = async () => {
  const users = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $match: { admin: false }
      },
      {
        $sort: { score: -1 }
      }
    ]
  })
  return users || []
}