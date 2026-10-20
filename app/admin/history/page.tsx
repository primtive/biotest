import { requireAdmin } from '@/lib/server/access';
import { getMongoDb } from '@/data/mongo';
import { readHistory, type HistoryQuery } from '@/lib/history';
import { HistoryTable } from '@/components/history-table';
export const metadata = { title: 'История' };
export default async function HistoryPage({ searchParams }: { searchParams: Promise<HistoryQuery> }) {
  await requireAdmin(); const query = await searchParams;
  try { const history = await readHistory(await getMongoDb(), query); return <HistoryTable {...history} admin />; }
  catch (error) { if (error instanceof RangeError) return <p role="alert">{error.message}</p>; throw error; }
}
