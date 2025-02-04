import { Leaderboard } from "@/components/leaderboard";
import Home from "./home";
import prisma from "@/data/prisma";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";
import { getUserLastTest } from "@/data/users";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const ogeTopicGroup = '67962ae5e4f21c30e05aef91';
const egeTopicGroup = '67962669e4f21c30e05aef8b';

export default async function Index() {
  const session = await getServerSession(authOptions)
  const topicGroupId = session?.user?.topicGroupId
  const topics = await prisma.topic.findMany({ where: { topicGroupId, active: true }, include: { topicGroup: true } })
  const lastTest = session?.user ? (await getUserLastTest(session.user.id)) : false
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
    <Leaderboard topicGroupId={ogeTopicGroup} name={'Топ по очкам ОГЭ'} />
    <Leaderboard topicGroupId={egeTopicGroup} name={'Топ по очкам ЕГЭ'} />
  </>
}
