import { NextRequest } from "next/server";
import authOptions from "@/auth";
import { getServerSession } from "next-auth/next";
import { newRandomTest, newTestWithTopics } from '@/data/tests';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const searchParams = req.nextUrl.searchParams
  const topics = searchParams.get('topics')

  const userId = session?.user!.name || "";
  var testId;

  if (topics) {
    const topicIds = topics.split(",");
    testId = await newTestWithTopics(topicIds, userId);
  } else {
    testId = await newRandomTest(userId);
  }
  return new Response(`/t/${testId}`)
}
