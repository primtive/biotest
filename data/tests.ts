import prisma from "./prisma";

export async function newRandomTest(userId: string) {
  const user = await prisma.user.findFirstOrThrow({ where: { name: userId } })

  const topicGroupId = user.topicGroupId

  const tasks: any = await prisma.task.findMany({
    take: 10,
    include: { topic: true },
    where: { topic: { topicGroupId }, active: true }
  })
  if (!tasks) return
  const test = await prisma.test.create({
    data: {
      userId: user.id,
      tasksIds: tasks!.map((task: any) => task.id),
      topicGroupId
    }
  })
  return test.id!
}

export async function newTestWithTopics(topicIds: Array<string>, userId: string) {
  const user = await prisma.user.findFirstOrThrow({ where: { name: userId } })

  const topicGroupId = user.topicGroupId

  const allTasks: any = await prisma.task.findMany({
    where: {
      topicId: {
        in: topicIds,
      },
      active: true
    },
  });
  console.log(allTasks);
  const tasks = allTasks.sort(() => 0.5 - Math.random()).slice(0, 10);
  if (!tasks) return
  const test = await prisma.test.create({
    data: {
      topicGroupId,
      userId: user.id,
      tasksIds: tasks!.map((task: any) => task.id),
    }
  })
  return test.id!
}