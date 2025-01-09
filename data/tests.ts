import prisma from "./prisma";

export async function newRandomTest(userId: string) {
  const user = await prisma.user.findFirstOrThrow({ where: { name: userId } })

  const tasks: any = await prisma.task.aggregateRaw({
    pipeline: [
      { $sample: { size: 10 } }
    ]
  })
  if (!tasks) return
  const test = await prisma.test.create({
    data: {
      userId: user.id,
      tasksIds: tasks!.map((task: any) => task._id.$oid)
    }
  })
  return test.id!
}

export async function newTestWithTopics(topicIds: Array<string>, userId: string) {
  const user = await prisma.user.findFirstOrThrow({ where: { name: userId } })

  const allTasks: any = await prisma.task.findMany({
    where: {
      topicId: {
        in: topicIds,
      },
    },
  });
  console.log(allTasks);
  const tasks = allTasks.sort(() => 0.5 - Math.random()).slice(0, 10);
  if (!tasks) return
  const test = await prisma.test.create({
    data: {
      userId: user.id,
      tasksIds: tasks!.map((task: any) => task.id)
    }
  })
  return test.id!
}