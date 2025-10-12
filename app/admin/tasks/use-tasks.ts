import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

export function useTasks() {
  const params = useSearchParams();

  const page = params.get('page') ?? '1';

  const topics = params.get('topics') ?? '';
  const sources = params.get('sources') ?? '';
  const line = params.get('line') ?? '';

  return useQuery({
    queryKey: ['tasks', page, topics, sources, line],
    queryFn: async () => {
      const res = await fetch(
        `/api/tasks?page=${page}&topics=${topics}&sources=${sources}&line=${line}`
      );
      return res.json();
    },
  });
}
