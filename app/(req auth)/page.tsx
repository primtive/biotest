import Index from ".";
import prisma from "@/data/prisma";

export default async function Home() {
  const topics = await prisma.topic.findMany()

  return <Index topics={topics} />
}
