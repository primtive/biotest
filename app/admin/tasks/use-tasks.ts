import { requestJson } from '@/lib/client-request';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useTasks() {
  const params = useSearchParams();

  const page = params.get('page') ?? '1';
  const pageSize = params.get('pageSize') ?? '20';

  const topics = params.get('topics') ?? '';
  const sources = params.get('sources') ?? '';
  const line = params.get('line') ?? '';

  return useQuery({
    staleTime: 15000,
    placeholderData: keepPreviousData,
    queryKey: ['tasks', page, pageSize, topics, sources, line],
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({ page, pageSize, topics, sources, line });
      return requestJson<any>(`/api/tasks?${query}`, { signal });
    },
  });
}
