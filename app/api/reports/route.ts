import prisma from "@/data/prisma"
import { NextRequest, NextResponse } from "next/server"
import authOptions from '@/auth';
import { getServerSession } from 'next-auth/next';
import { topicGroupIds } from "@/data/topicGroups";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  const params = request.nextUrl.searchParams

  const from = params.get('from')
  const to = params.get('to')
  if (!from || !to) return NextResponse.json({ message: 'from or to not specified' }, { status: 400 })

  if (isNaN(new Date(from).getTime()) || isNaN(new Date(to).getTime())) {
    return NextResponse.json({ message: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const topicGroup = params.get('topicGroup')
  if (!topicGroup) return NextResponse.json({ message: 'topicGroup not specified' }, { status: 400 })

  const completedOnly = params.has('completedOnly')

  const selectedGroupIds = []
  switch (topicGroup) {
    case 'all':
      selectedGroupIds.push(...Object.values(topicGroupIds))
      break
    case 'oge':
      selectedGroupIds.push(topicGroupIds['ОГЭ'])
      break
    case 'ege':
      selectedGroupIds.push(topicGroupIds['ЕГЭ'])
      break
  }

  const data = await prisma.user.aggregateRaw({
    pipeline: [
      // Шаг 1: Фильтрация пользователей по topicGroupId
      {
        $match: {
          topicGroupId: { $in: selectedGroupIds.map(id => ({ $oid: id })) }
        }
      },
      // Шаг 2: Соединение с тестами в нужном временном промежутке
      {
        $lookup: {
          from: "Test",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    {
                      $gte: [
                        "$createdAt",
                        { $dateFromString: { dateString: from } }
                      ]
                    },
                    {
                      $lte: [
                        "$createdAt",
                        { $dateFromString: { dateString: to, } }
                      ]
                    },
                    ...(completedOnly ? [
                      { $eq: ["$isComplete", true] }
                    ] : [])
                  ]
                }
              }
            },
            // Шаг 3: Для каждого теста считаем правильные ответы
            {
              $addFields: {
                correctAnswers: {
                  $size: {
                    $ifNull: [{
                      $filter: {
                        input: "$answers",
                        as: "answer",
                        cond: { $eq: ["$$answer.correct", true] }
                      }
                    }, []]
                  }
                }
              }
            }
          ],
          as: "filteredTests"
        }
      },
      // Шаг 5: Расчет итоговой статистики
      {
        $project: {
          _id: 1,
          username: 1,
          name: 1,
          isArchive: 1,
          topicGroupId: 1,
          filteredTests: 1,
          testCount: { $size: { $ifNull: ["$filteredTests", []] } },
          score: {
            $sum: "$filteredTests.correctAnswers"
          }
        }
      },
      {
        $match: {
          isArchive: false
        }
      },
      // Шаг 6: Сортировка (например, по количеству тестов)
      {
        $sort: {
          testCount: -1
        }
      }
    ]
  });

  return new NextResponse(JSON.stringify({
    data,
    from: from,
    to: to
  }))
}