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

export function AddTrainerModal({ open, onClose, onSubmit, isLoading, errorMessage }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });
  const nameField = register('name');
  const emailField = register('email');
  const passwordField = register('password');
  const phoneField = register('phone');

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Trainer" size="lg" variant="dark">
      <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          id="add-trainer-name"
          label="Name"
          required
          error={errors.name?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          name={nameField.name}
          onChange={nameField.onChange}
          onBlur={nameField.onBlur}
          ref={nameField.ref}
        />
        <Input
          id="add-trainer-email"
          label="Email"
          type="email"
          required
          autoComplete="off"
          error={errors.email?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          name={emailField.name}
          onChange={emailField.onChange}
          onBlur={emailField.onBlur}
          ref={emailField.ref}
        />
        <Input
          id="add-trainer-password"
          label="Password"
          type="password"
          passwordToggle
          required
          autoComplete="new-password"
          error={errors.password?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          name={passwordField.name}
          onChange={passwordField.onChange}
          onBlur={passwordField.onBlur}
          ref={passwordField.ref}
        />
        <Input
          id="add-trainer-phone"
          label="Phone (optional)"
          error={errors.phone?.message}
          labelClassName="text-[var(--text2)]"
          className="bg-[var(--tc-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)]"
          name={phoneField.name}
          onChange={phoneField.onChange}
          onBlur={phoneField.onBlur}
          ref={phoneField.ref}
        />
        {errorMessage ? (
          <p className="text-sm text-danger">{errorMessage}</p>
        ) : null}
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
