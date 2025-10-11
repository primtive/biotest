import { NextResponse } from "next/server";
import prisma from "@/data/prisma";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id || ''
  const data = await request.json()
  delete data.id
  if (id == 'new') {
    const task = await prisma.task.create({
      data: { ...data }
    })
  }
  else {
    const task = await prisma.task.update({
      where: {
        id
      },
      data: { ...data }
    })
  }
  return new NextResponse()
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id || ''
  await prisma.task.delete({
    where: { id }
  })
  return Response.json({ ok: true })
}