import prisma from "@/data/prisma";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
    const topics = await prisma.topic.findMany()
    return new NextResponse(JSON.stringify(topics))
}