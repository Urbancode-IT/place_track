import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { interviewApi } from '@/api/interview.api';
import { dashboardApi } from '@/api/dashboard.api';

export function useInterviews(params) {
  return useQuery({
    queryKey: ['interviews', params],
    queryFn: () => interviewApi.list(params).then((r) => r.data),
  });
}

export function useInterview(id) {
  return useQuery({
    queryKey: ['interview', id],
    queryFn: () => interviewApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useTodayInterviews() {
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['dashboard', 'today'],
    queryFn: () => dashboardApi.today().then((r) => r.data),
    enabled: hydrated && !!accessToken,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => interviewApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => interviewApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['interview', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => interviewApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student'] });
      qc.invalidateQueries({ queryKey: ['trainer-interviews'] });
    },
  });
}

export function useUpdateInterviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => interviewApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['interviews'] });
      const previous = qc.getQueriesData({ queryKey: ['interviews'] });
      qc.setQueriesData({ queryKey: ['interviews'] }, (old) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((i) => (i.id == id ? { ...i, status } : i)),
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data));
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
