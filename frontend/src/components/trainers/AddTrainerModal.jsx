import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export function AddTrainerModal({ open, onClose, onSubmit, isLoading }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Trainer" size="lg" variant="dark">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Name"
          error={errors.name?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          {...register('name')}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          error={errors.password?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          {...register('password')}
        />
        <Input
          label="Phone (optional)"
          error={errors.phone?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          {...register('phone')}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Adding…' : 'Add Trainer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
