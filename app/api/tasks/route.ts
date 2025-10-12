import prisma from "@/data/prisma";
import { NextRequest, NextResponse } from "next/server";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.admin)
    return new NextResponse(JSON.stringify({ message: "forbidden" }), {
      status: 403,
    });
  const params = request.nextUrl.searchParams;

  const page = parseInt(params.get("page") || "1");
  const limit = 20; // parseInt(params.get("limit") || "20");
  const skip = (page - 1) * limit;

  const topics = params.get("topics")?.split(",") ?? [];
  const sources = params.get("sources")?.split(",") ?? [];

  const line = params.get("line");

  const where = {
    ...(topics[0] || false ? { topicId: { in: topics } } : {}),
    ...(sources[0] || false ? { source: { in: sources } } : {}),
    ...(line ? { line: { contains: line } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        isReported: 'desc'
      },
      include: { topic: true },
    }),
    prisma.task.count({
      where,
    }),
  ]);
  console.log(where, items);
  return new NextResponse(
    JSON.stringify({ items, total, totalPages: Math.ceil(total / 20) })
  );
}
