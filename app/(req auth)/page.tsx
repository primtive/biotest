import { Leaderboard } from "@/components/leaderboard";
import Home from "./home";
import prisma from "@/data/prisma";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";
import { getLeaderboard, getUserLastTest, getUserTopicPercentages } from "@/data/users";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import topicGroups from "@/data/topicGroups";

export default async function Index() {
  const session = await getServerSession(authOptions)
  const topicGroupId = session?.user?.topicGroupId
  const topics = await prisma.topic.findMany({ where: { topicGroupId, active: true }, include: { topicGroup: true }, orderBy: [{ section: 'asc' }] })
  const lastTest = session?.user ? (await getUserLastTest(session.user.id)) : false
  const data = await Promise.all(topicGroups.map(async topicGroup => {
    const data = await getLeaderboard(topicGroup.topicGroupId);
    const leaderboard = data.filter((x: any) => x.score != 0).filter((x: any, i: any) => i < 10)
    if (!leaderboard.find((x: any) => x._id.$oid == session?.user?.id)) {
      const user = data.find((x: any) => x._id.$oid == session?.user?.id)
      if (user) leaderboard.push({ ...user, index: data.indexOf(user) })
    }
    return {
      ...topicGroup,
      leaderboard
    }
  }))
  const topicPercentages = session ? await getUserTopicPercentages(session!.user!.id) : {};

  return <>
    {session &&
      <>
        {lastTest && !lastTest.isComplete &&
          <Card className="space-y-2" >
            <p>Вы не закончили прошлый тест!</p>
            <a href={`/t/${lastTest.id}`} className={buttonVariants()}>Вернуться</a>
          </Card>}
        <Home topics={topics} topicGroupId={topicGroupId!} topicPercentages={topicPercentages} />
      </>}
    <Leaderboard data={data} initTopicGroupId={topicGroupId} userId={session?.user?.id} />
  </>
}
