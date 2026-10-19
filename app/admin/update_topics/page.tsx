import { requireAdmin } from '@/lib/server/access';
export default async function UpdateTopicsPage() {
  await requireAdmin();
  return <p>Пересчёт прогресса запускается администратором из терминала: <code>npm run db:repair -- --apply</code>. Открытие страницы не изменяет данные.</p>;
}
