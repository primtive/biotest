import { Leaderboard } from "@/components/leaderboard";
import Home from "./home";
import prisma from "@/data/prisma";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";
import { getUserLastTest } from "@/data/users";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function Index() {
  const topics = await prisma.topic.findMany()
  const session = await getServerSession(authOptions)
  const lastTest = session?.user ? (await getUserLastTest(session.user.id)) : false
  console.log(lastTest);
  return <>
    {session &&
      <>
        {lastTest && !lastTest.isComplete &&
          <Card className="space-y-2" >
            <p>Вы не закончили прошлый тест!</p>
            <a href={`/t/${lastTest.id}`} className={buttonVariants()}>Вернуться</a>
            </Card>}
        <Home topics={topics} />
      </>}
    <Leaderboard />
  </>
}
