import { getApiUser, apiError, parseId } from '@/lib/server/access';
import { completeAttempt } from '@/lib/server/attempts';
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try { const user = await getApiUser(request); return Response.json(await completeAttempt(user, parseId((await props.params).id))); }
  catch (error) { return apiError(error); }
}
