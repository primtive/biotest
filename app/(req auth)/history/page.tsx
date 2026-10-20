import { requireUser } from '@/lib/server/access';
import { getMongoDb } from '@/data/mongo';
import { readHistory, type HistoryQuery } from '@/lib/history';
import { HistoryTable } from '@/components/history-table';
export const metadata = { title: 'История тестов' };
export default async function MyHistory({ searchParams }: { searchParams: Promise<HistoryQuery> }) {
  const user = await requireUser(), query = await searchParams;
  try { const history = await readHistory(await getMongoDb(), query, user.id); return <HistoryTable {...history} />; }
  catch (error) { if (error instanceof RangeError) return <p role="alert">{error.message}</p>; throw error; }
}
