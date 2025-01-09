import prisma from "@/data/prisma";
import { JsonObject } from "@prisma/client/runtime/library";

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    // select: {
    //   name: true,
    //   username: true,
    //   admin: true
    // }
  })
  return users
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