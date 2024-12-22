import prisma from "./prisma";

export async function newRandomTest(userId?: string) {
  const user = await prisma.user.findFirst({ where: { name: userId } })

  const tasks: any = await prisma.task.aggregateRaw({
    pipeline: [
      { $sample: { size: 10 } }
    ]
  })
  if (!tasks) return
  const test = await prisma.test.create({
    data: {
      userId: user?.id,
      tasksIds: tasks!.map((task: any) => task._id.$oid)
    }
  })
  return test.id!
}