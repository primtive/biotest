import prisma from "@/data/prisma"
import { updateTopicProgress } from "@/data/users"


export default async function page() {
  console.log("Starting full progress recalculation...");

  // Fetch all users
  const users = await prisma.user.findMany({
    select: { id: true, name: true }
  });

  for (const user of users) {
    console.log(`Processing user: ${user.name}`);

    // Find all unique topic IDs this user has encountered in their tests
    const userTests = await prisma.test.findMany({
      where: { userId: user.id },
      select: { tasks: { select: { topicId: true } } }
    });

    const uniqueTopicIds = new Set<string>();
    userTests.forEach(test => {
      test.tasks.forEach(task => uniqueTopicIds.add(task.topicId));
    });

    // Run update for each topic the user has touched
    for (const topicId of uniqueTopicIds) {
      await updateTopicProgress(user.id, topicId);
    }
  }

  console.log("Finished recalculating all progress.")
  return <>ok</>;
}
