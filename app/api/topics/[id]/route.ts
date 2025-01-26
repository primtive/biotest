import { NextRequest, NextResponse } from "next/server";
import prisma from "@/data/prisma";

// export async function GET(request: Request) {
//   console.log(request);
// }

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  var body = await request.json();
  const id = params.id || ''
  if (id == 'new') {
    const topic = await prisma.topic.create({
      data: body,
    })
    return Response.json({ ok: true, id: topic.id })
  }
  delete body.id
  const topic = await prisma.topic.upsert({
    where: { id },
    update: body,
    create: body
  })
  return Response.json({ ok: true, id: topic.id })
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id || ''
  await prisma.topic.delete({
    where: { id }
  })
  return Response.json({ ok: true })
}