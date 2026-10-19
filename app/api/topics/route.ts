import prisma from '@/data/prisma';
import { getApiUser, apiError } from '@/lib/server/access';
export async function GET(request: Request) {
  try { await getApiUser(request, true); return Response.json(await prisma.topic.findMany({ select: { id: true, name: true, section: true, active: true, topicGroupId: true } })); }
  catch (error) { return apiError(error); }
}
