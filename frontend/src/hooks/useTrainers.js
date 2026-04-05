import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainerApi } from '@/api/trainer.api';

export function useTrainers() {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainerApi.list().then((r) => r.data),
  });
}

export function useCreateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => trainerApi.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainers'] }),
  });
}

export function useTrainerInterviews(id) {
  return useQuery({
    queryKey: ['trainer-interviews', id],
    queryFn: () => trainerApi.getInterviews(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useNotifyTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trainerId, interviewId }) => trainerApi.notify(trainerId, interviewId),
    onSuccess: (_, { trainerId }) => qc.invalidateQueries({ queryKey: ['trainer-interviews', trainerId] }),
  });
}
