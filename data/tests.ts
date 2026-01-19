import prisma from "./prisma";

export async function newRandomTest(userId: string) {
  const user = await prisma.user.findFirstOrThrow({ where: { name: userId } });

  const topicGroupId = user.topicGroupId;

  const allTasks: any = await prisma.task.findMany({
    include: { topic: true },
    where: {
      topic: { topicGroupId, active: true },
      active: true,
      isReported: false,
    },
  });
  const tasks = allTasks.sort(() => 0.5 - Math.random()).slice(0, 10);
  if (!tasks) return;
  const test = await prisma.test.create({
    data: {
      userId: user.id,
      tasksIds: tasks!.map((task: any) => task.id),
      topicGroupId,
    },
  });
  return test.id!;
}

export async function newTestWithTopics(
  topicIds: Array<string>,
  userName: string,
) {
  const user = await prisma.user.findFirstOrThrow({ where: { name: userName } });

  const topicGroupId = user.topicGroupId;
  let correctTaskIds = [];
  for (const topicId of topicIds) {
    const progress = await prisma.userTopicProgress.findUnique({
      where: {
        userId_topicId: { userId: user.id, topicId },
      },
    });
    if (progress?.correctTaskIds) {
      correctTaskIds.push(...progress.correctTaskIds);
    }
  }
  let allTasks: any = await prisma.task.findMany({
    where: {
      topicId: {
        in: topicIds,
      },
      id: {
        notIn: correctTaskIds,
      },
      active: true,
      isReported: false,
    },
  });
  if (allTasks.length == 0) {
    allTasks = await prisma.task.findMany({
      where: {
        topicId: {
          in: topicIds,
        },
        active: true,
        isReported: false,
      },
    });
  }

  const tasks = allTasks.sort(() => 0.5 - Math.random()).slice(0, 10);
  if (!tasks) return;
  const test = await prisma.test.create({
    data: {
      topicGroupId,
      userId: user.id,
      tasksIds: tasks!.map((task: any) => task.id),
    },
  });
  return test.id!;
}
