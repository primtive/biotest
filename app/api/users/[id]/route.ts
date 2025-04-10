import { NextRequest, NextResponse } from "next/server";
import prisma from "@/data/prisma";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  var body = await request.json();
  const id = params.id || ''
  if (id == 'new') {
    const user = await prisma.user.create({
      data: body,
    })
    return Response.json({ ok: true, id: user.id })
  }
  delete body.id
  const user = await prisma.user.upsert({
    where: { id },
    update: body,
    create: body
  })
  return Response.json({ ok: true, id: user.id })
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id || ''
  await prisma.user.delete({
    where: { id }
  })
  return Response.json({ ok: true })
}