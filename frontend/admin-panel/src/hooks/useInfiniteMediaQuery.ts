import { useState, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Media } from '../types/media';

interface UseInfiniteMediaQueryOptions {
  enabled: boolean;
  pageSize?: number;
}

export function useInfiniteMediaQuery({ enabled, pageSize = 20 }: UseInfiniteMediaQueryOptions) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ['media', 'infinite', { search: debouncedSearch }],
    queryFn: ({ pageParam }) => api.listMedia({
      limit: pageSize,
      last_key: pageParam,
      search: debouncedSearch || undefined,
    }),
    getNextPageParam: (lastPage) => {
      if (lastPage.last_key) {
        return JSON.stringify(lastPage.last_key);
      }
      return undefined;
    },
    enabled,
    initialPageParam: undefined as string | undefined,
  });

  const items: Media[] = useMemo(
    () => query.data?.pages.flatMap(page => page.items) ?? [],
    [query.data?.pages]
  );

  return {
    items,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    search,
    setSearch,
    error: query.error,
    refetch: query.refetch,
  };
}
