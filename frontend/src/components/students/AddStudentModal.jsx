import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { COURSE_COLORS } from '@/utils/constants';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  course: z.enum(Object.keys(COURSE_COLORS)),
  batchId: z.string().optional(),
});

export function AddStudentModal({ open, onClose, onSubmit }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', course: 'FSD', batchId: '' },
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Student" size="lg" variant="dark">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Select
          label="Course"
          options={Object.keys(COURSE_COLORS).map((c) => ({ value: c, label: c }))}
          error={errors.course?.message}
          {...register('course')}
        />
        <Input label="Batch ID" error={errors.batchId?.message} {...register('batchId')} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Student</Button>
        </div>
      </form>
    </Modal>
  );
}
