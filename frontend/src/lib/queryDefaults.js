/** Shared React Query defaults — fewer refetches, snappier navigation. */
export const QUERY_STALE_MS = 1000 * 60 * 3; // 3 minutes
export const QUERY_GC_MS = 1000 * 60 * 15;

export const listQueryOptions = {
  staleTime: QUERY_STALE_MS,
  gcTime: QUERY_GC_MS,
  refetchOnWindowFocus: false,
  placeholderData: (prev) => prev,
};
