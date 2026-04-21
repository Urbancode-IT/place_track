import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/student.api';
import { trainerApi } from '@/api/trainer.api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Button } from '@/components/ui/Button';
import { COURSE_SELECT_OPTIONS } from '@/utils/constants';

const courseEnum = z.enum([
  'FSD',
  'SDET',
  'BI_DS',
  'NETWORKING',
  'AWS',
  'JAVA',
  'REACT',
]);

const schema = z.object({
  studentId: z.string().uuid(),
  course: courseEnum,
  company: z.string().min(1),
  round: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  hrNumber: z.string().optional(),
  room: z.string().optional(),
  trainerIds: z.array(z.string()).optional(),
});

export function AddScheduleModal({ open, onClose, onSubmit, initialData = null, mode = 'create' }) {
  const { data: studentsRes } = useQuery({
    queryKey: ['students', { limit: 200 }],
    queryFn: () => studentApi.list({ limit: 200 }).then((r) => r.data),
    enabled: open,
  });
  const { data: trainersRes } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainerApi.list().then((r) => r.data),
    enabled: open,
  });

  const students = studentsRes?.data || [];
  const trainers = trainersRes?.data || [];

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: '',
      course: 'FSD',
      company: '',
      round: '',
      date: '',
      timeSlot: '',
      hrNumber: '',
      room: '',
      trainerIds: [],
    },
  });

  const trainerIds = watch('trainerIds') || [];
  const { onChange: onStudentChange, ...studentRegister } = register('studentId');

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const trainerValues = (initialData.trainers || [])
        .map((t) => t?.trainer?.id || t?.trainerId)
        .filter(Boolean);
      const dateValue = initialData.date ? new Date(initialData.date).toISOString().slice(0, 10) : '';
      const initialCourse =
        initialData.student?.course && courseEnum.safeParse(initialData.student.course).success
          ? initialData.student.course
          : 'FSD';
      reset({
        studentId: initialData.studentId || initialData.student?.id || '',
        course: initialCourse,
        company: initialData.company || '',
        round: initialData.round || '',
        date: dateValue,
        timeSlot: initialData.timeSlot || '',
        hrNumber: initialData.hrNumber || '',
        room: initialData.room || '',
        trainerIds: trainerValues,
      });
    } else {
      reset({
        studentId: '',
        course: 'FSD',
        company: '',
        round: '',
        date: '',
        timeSlot: '',
        hrNumber: '',
        room: '',
        trainerIds: [],
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data) => {
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(),
      trainerIds: Array.isArray(data.trainerIds) ? data.trainerIds : [data.trainerIds].filter(Boolean),
    };
    try {
      await Promise.resolve(onSubmit(payload));
      onClose();
    } catch {
      /* Parent shows error toast; keep modal open */
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Schedule' : 'Add Schedule'} size="xl" variant="dark">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Select
          label="Student"
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          error={errors.studentId?.message}
          {...studentRegister}
          onChange={(e) => {
            onStudentChange(e);
            const sid = e.target.value;
            const s = students.find((x) => x.id === sid);
            if (s?.course && courseEnum.safeParse(s.course).success) {
              setValue('course', s.course);
            }
          }}
        />
        <Select
          label="Course"
          options={COURSE_SELECT_OPTIONS}
          error={errors.course?.message}
          {...register('course')}
        />
        <Input label="Company" error={errors.company?.message} {...register('company')} />
        <Input label="Round" error={errors.round?.message} {...register('round')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <Input
            label="Time Slot"
            showTimeIcon
            placeholder="e.g. 10:00 AM - 11:00 AM"
            error={errors.timeSlot?.message}
            {...register('timeSlot')}
          />
        </div>
        <Input label="HR Number" {...register('hrNumber')} />
        <Input label="Room" {...register('room')} />
        <MultiSelect
          label="Trainers"
          options={trainers.map((t) => ({ value: t.id, label: t.name }))}
          value={trainerIds}
          onChange={(vals) => setValue('trainerIds', vals)}
          placeholder="Select trainers"
          error={errors.trainerIds?.message}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{mode === 'edit' ? 'Update' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}
