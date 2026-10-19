export const PAGE_SIZES = [10, 20, 30, 50, 100] as const;
export type PageQuery = { page?: string; pageSize?: string };
export function parsePagination(query: PageQuery) {
  const page = Number(query.page || 1), pageSize = Number(query.pageSize || 20);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new RangeError('Некорректный номер страницы');
  if (!(PAGE_SIZES as readonly number[]).includes(pageSize)) throw new RangeError('Недопустимый размер страницы');
  return { page, pageSize, skip: (page - 1) * pageSize };
}
export function pageInfo(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { total, totalPages, page: Math.min(page, totalPages), pageSize };
}
