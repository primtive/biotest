import prisma from "@/data/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const pageIndex = parseInt(params.get('page_index') || '0')
  const pageSize = parseInt(params.get('page_size') || '20')

  const data = await prisma.task.findMany({skip: pageIndex*pageSize, take: pageSize, include: {topic: true}})

  const total = await prisma.task.count()
  return new NextResponse(JSON.stringify({
    data: data,
    pagination: {
      total,
    }
  }))
}