import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobApplicationApi } from '@/api/jobApplication.api';
import { listQueryOptions, jobApplicationQueryOptions } from '@/lib/queryDefaults';
import { retryOnNetworkError } from '@/lib/networkError';

export function useJobApplicationSpocs({ withEntries = false } = {}) {
  return useQuery({
    queryKey: ['job-applications', 'spocs', { withEntries }],
    queryFn: () =>
      jobApplicationApi
        .listSpocs(withEntries ? { withEntries: true } : undefined)
        .then((r) => r.data),
    ...listQueryOptions,
  });
}

export function useJobApplicationStudents(params = {}) {
  const { spocUserId, dateFrom, dateTo, enabled = true } = params;
  return useQuery({
    queryKey: ['job-applications', 'students', { spocUserId, dateFrom, dateTo }],
    queryFn: () =>
      jobApplicationApi
        .listStudents({
          ...(spocUserId ? { spocUserId } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        })
        .then((r) => r.data),
    ...listQueryOptions,
    // Do not keep another SPOC’s students visible while this list loads.
    placeholderData: undefined,
    enabled,
  });
}

export function useJobApplicationPortals() {
  return useQuery({
    queryKey: ['job-applications', 'portals'],
    queryFn: () => jobApplicationApi.listPortals().then((r) => r.data),
    ...listQueryOptions,
  });
}

export function useJobApplicationDaily({ date, spocUserId, allSpocs = false }) {
  return useQuery({
    queryKey: ['job-applications', 'daily', { date, spocUserId: spocUserId || null }],
    queryFn: () =>
      jobApplicationApi
        .getDaily({
          date,
          ...(spocUserId ? { spocUserId } : {}),
        })
        .then((r) => r.data),
    enabled: Boolean(date) && (allSpocs || Boolean(spocUserId)),
    ...jobApplicationQueryOptions,
  });
}

export function useJobApplicationHistory(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['job-applications', 'history', params],
    queryFn: () => jobApplicationApi.list(params).then((r) => r.data),
    enabled,
    ...jobApplicationQueryOptions,
  });
}

function invalidateJobApplicationQueries(qc) {
  qc.invalidateQueries({ queryKey: ['job-applications'] });
}

function saveRequest(request) {
  // A stale keep-alive socket fails the first PUT/POST with no response body.
  return retryOnNetworkError(request, { attempts: 2 });
}

export function useCreateJobApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => saveRequest(() => jobApplicationApi.create(data).then((r) => r.data)),
    onSuccess: () => invalidateJobApplicationQueries(qc),
  });
}

export function useUpdateJobApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      saveRequest(() => jobApplicationApi.update(id, data).then((r) => r.data)),
    onSuccess: () => invalidateJobApplicationQueries(qc),
  });
}

export function useDeleteJobApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => jobApplicationApi.delete(id).then((r) => r.data),
    onSuccess: () => invalidateJobApplicationQueries(qc),
  });
}
