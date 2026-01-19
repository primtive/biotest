import { NextResponse } from "next/server";
import { updateTopicProgress } from "@/data/users";
import prisma from "@/data/prisma";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const id = params.id || "";
  const test = await prisma.test.update({
    where: {
      id,
    },
    data: {
      completedAt: new Date(),
      isComplete: true,
    },
    include: {
      tasks: true,
    },
  });
  const user = await prisma.user.findFirstOrThrow({
    where: { id: test.userId! },
  });
  let scores = user.scores || [];
  scores?.push({
    createdAt: new Date(),
    score: test.answers.reduce((acc, a) => acc + +a.correct, 0),
    testId: id,
  });
  const percentAggregation: any = await prisma.test.aggregateRaw({
    pipeline: [
      {
        $match: {
          userId: { $oid: user.id },
          isComplete: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          totalAnswers: { $size: "$answers" },
          correctAnswers: {
            $size: {
              $filter: {
                input: "$answers",
                as: "answer",
                cond: { $eq: ["$$answer.correct", true] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAnswers: { $sum: "$totalAnswers" },
          correctAnswers: { $sum: "$correctAnswers" },
        },
      },
      {
        $project: {
          _id: 0,
          percent: {
            $multiply: [{ $divide: ["$correctAnswers", "$totalAnswers"] }, 100],
          },
        },
      },
    ],
  });
  const percent = percentAggregation[0]?.percent;
  await prisma.user.update({
    where: { id: test.userId! },
    data: {
      scores,
      percent,
      score: scores.reduce((acc, a) => a.score + acc, 0),
      testsCount: ++user.testsCount,
    },
  });
  for (const topicId of [...new Set(test.tasks.map((task) => task.topicId))]) {
    await updateTopicProgress(test.userId!, topicId);
  }
  return new NextResponse();
}
