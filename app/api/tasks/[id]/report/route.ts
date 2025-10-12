import { NextResponse } from "next/server";
import prisma from "@/data/prisma";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id
  await prisma.task.update({
    where: {
      id: id
    },
    data: {
      isReported: true
    }
  })
  return NextResponse.json({ ok: true })
}