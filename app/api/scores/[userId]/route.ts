import { NextResponse } from "next/server";
import prisma from "@/data/prisma";

export async function POST(request: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const userId = params.userId || ''
  const data = await request.json()
  const user = await prisma.user.findFirst({ where: { id: userId } })
  user?.scores.push({
    score: data.score,
    createdAt: new Date(),
    testId: ''
  })
  console.log(user?.scores);
  await prisma.user.update({
    where: { id: userId },
    data: {
      scores: user?.scores,
      score: user?.scores.reduce((acc, a) => a.score + acc, 0),
    }
  })
  return new NextResponse()
}