import { Leaderboard } from "@/components/leaderboard";
import Home from "./home";
import prisma from "@/data/prisma";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";
import { getLeaderboard, getUserLastTest } from "@/data/users";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const topicGroups = [
  { topicGroupId: '67962ae5e4f21c30e05aef91', name: 'ОГЭ' },
  { topicGroupId: '67962669e4f21c30e05aef8b', name: 'ЕГЭ' },
]

export default async function Index() {
  const session = await getServerSession(authOptions)
  const topicGroupId = session?.user?.topicGroupId
  const topics = await prisma.topic.findMany({ where: { topicGroupId, active: true }, include: { topicGroup: true } })
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

  return <>
    {session &&
      <>
        {lastTest && !lastTest.isComplete &&
          <Card className="space-y-2" >
            <p>Вы не закончили прошлый тест!</p>
            <a href={`/t/${lastTest.id}`} className={buttonVariants()}>Вернуться</a>
          </Card>}
        <Home topics={topics} topicGroupId={topicGroupId!} />
      </>}
    <Leaderboard data={data} initTopicGroupId={topicGroupId} userId={session?.user?.id} />
  </>
}
