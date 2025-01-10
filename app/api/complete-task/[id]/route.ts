import { NextResponse } from "next/server";
import prisma from "@/data/prisma";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id || ''
  const data = await request.json()
  const test = await prisma.test.update({
    where: {
      id
    },
    data: {
      answers: data.map((answer: any) => ({ taskId: answer.id, answer: answer.userAnswer, correct: answer.correct == 1 }))
    }
  })
  return new NextResponse()
}