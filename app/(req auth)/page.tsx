import { Leaderboard } from "@/components/leaderboard";
import Home from "./home";
import prisma from "@/data/prisma";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";

export default async function Index() {
  const topics = await prisma.topic.findMany()
  const session = await getServerSession(authOptions)
  return <>
    {session && <Home topics={topics} />}
    <Leaderboard />
  </>
}
