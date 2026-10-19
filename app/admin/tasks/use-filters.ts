'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function useTaskFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const filters = {
    page: Math.max(1, Number(params.get('page')) || 1),
    topics: params.get('topics')?.split(',').filter(Boolean) ?? [],
    sources: params.get('sources')?.split(',').filter(Boolean) ?? [],
    line: params.get('line') ?? '',
  };

  const setFilter = (key: string, value: string | string[] | number | undefined) => {
    const newParams = new URLSearchParams(params.toString());

    if (Array.isArray(value)) {
      if (value.length) newParams.set(key, value.join(','));
      else newParams.delete(key);
    } else if (value !== undefined && value !== '') {
      newParams.set(key, String(value));
    } else {
      newParams.delete(key);
    }

    // При изменении фильтров — сбрасываем страницу
    if (key !== 'page') newParams.set('page', '1');

    router.replace(`?${newParams.toString()}`);
  };

  return { filters, setFilter };
}
