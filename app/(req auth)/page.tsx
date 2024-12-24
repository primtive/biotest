import Home from "./home";
import prisma from "@/data/prisma";

export default async function Index() {
  const topics = await prisma.topic.findMany()

  return <Home topics={topics} />
}
