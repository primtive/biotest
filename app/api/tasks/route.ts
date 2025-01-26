import prisma from "@/data/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const pageIndex = parseInt(params.get('page_index') || '0')
  const pageSize = parseInt(params.get('page_size') || '20')
  const topics = params.get('topics')?.split(',') || []
  const isTopics = topics![0] || false
  console.log({
    where: { topicId: isTopics ? { in: topics } : { notIn: [] } },
    skip: pageIndex * pageSize,
    take: pageSize,
    include: { topic: true }
  });
  const data = await prisma.task.findMany({
    where: { topicId: isTopics ? { in: topics } : { notIn: [] } },
    skip: pageIndex * pageSize,
    take: pageSize,
    include: { topic: true }
  })
  const total = await prisma.task.count({
    where: { topicId: isTopics ? { in: topics } : { notIn: [] } },
  })
  return new NextResponse(JSON.stringify({
    data: data,
    pagination: {
      total,
    }
  }))
}