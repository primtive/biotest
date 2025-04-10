import { NextResponse } from "next/server";
import prisma from "@/data/prisma";

const eqSet = (xs: any, ys: any) =>
  xs.size === ys.size &&
  [...xs].every((x) => ys.has(x));


function checkAnswer(task: any, userAnswer: string, disordered: boolean): boolean {
  if (task.answer == userAnswer) return true
  for (const singleAnswer of task.answer.split(', ')) {
    if (checkSingleAnswer(singleAnswer, userAnswer, disordered)) return true
  }
  return checkSingleAnswer(task.answer, userAnswer, disordered)
}

function checkSingleAnswer(correctAnswer: string, userAnswer: string, disordered: boolean) {
  if (disordered) if (eqSet(new Set(userAnswer.toLowerCase().replace(/\s/g, '')), new Set(correctAnswer.toLowerCase().replace(/\s/g, '')))) return true
  if (userAnswer.toLowerCase().replace(/\s/g, '') == correctAnswer.toLowerCase().replace(/\s/g, '')) return true
  return false
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id || ''
  const body = await request.json();
  const task = await prisma.task.findFirst({
    where: { id }
  })
  const isCorrect = checkAnswer(task, body.userAnswer, task?.disordered!)
  const test = await prisma.test.findFirst({
    where: {
      id: body.testId
    },
  })
  await prisma.test.update({
    where: {
      id: body.testId
    },
    data: {
      answers: [...test!.answers, { taskId: body.id, answer: body.userAnswer, correct: isCorrect }]
    }
  })
  return NextResponse.json({ correct: isCorrect })
}