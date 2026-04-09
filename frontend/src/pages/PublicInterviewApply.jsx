import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { publicSelfInterviewApi } from '@/api/publicSelfInterview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useNotificationStore } from '@/store/notification.store';

function UserPlusIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

const regSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  course: z.enum(['FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT'], { 
    errorMap: () => ({ message: 'Select a course' }) 
  }),
});

const schema = z.object({
  studentEmail: z.string().email('Enter a valid email'),
  company: z.string().min(1, 'Company is required'),
  round: z.string().min(1, 'Round is required'),
  date: z.string().min(1, 'Interview date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  hrNumber: z.string().optional(),
  comments: z.string().optional(),
});

/**
 * Shared link for all students — same URL. Student enters institute email + interview details.
 */
export default function PublicInterviewApply() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [showReg, setShowReg] = useState(false);

  const submitMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.apply(body).then((r) => r.data),
  });

  const regMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.registerStudent(body).then((r) => r.data),
    onSuccess: (data) => {
      addToast({ type: 'success', message: 'Student registered! You can now submit your interview.' });
      setShowReg(false);
      resetReg();
    },
    onError: (err) => {
      addToast({ type: 'error', message: err?.response?.data?.message || 'Registration failed' });
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentEmail: '',
      company: '',
      round: '',
      date: '',
      timeSlot: '',
      hrNumber: '',
      comments: '',
    },
  });

  const { 
    register: registerReg, 
    handleSubmit: handleSubmitReg, 
    reset: resetReg,
    formState: { errors: errorsReg } 
  } = useForm({
    resolver: zodResolver(regSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      course: 'FSD',
    },
  });

  useEffect(() => {
    document.title = 'Interview form — PlaceTrack';
  }, []);

  const openReg = () => setShowReg(true);

  if (submitMut.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-syne text-xl font-semibold">Thank you</h1>
          <p className="text-sm text-[var(--text2)]">
            {submitMut.data?.message || 'Submitted. Your placement team will review it.'}
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = (values) => {
    submitMut.mutate({
      ...values,
      date: new Date(values.date).toISOString(),
    });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 flex justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 sm:p-8 space-y-6"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">PlaceTrack</p>
            <h1 className="mt-1 font-syne text-[22px] font-semibold">Interview details</h1>
            <p className="mt-2 text-sm text-[var(--text2)]">
              Use the <strong className="text-[var(--text)]">same email</strong> your institute saved for you. After
              submit, placement will approve — then it appears on their today&apos;s live board.
            </p>
          </div>
          <button
            type="button"
            title="Register student"
            onClick={openReg}
            className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)] text-[var(--text2)] hover:text-[var(--cyan)] transition-colors mt-2"
          >
            <UserPlusIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Your email (on file with institute)"
            type="email"
            autoComplete="email"
            {...register('studentEmail')}
            error={errors.studentEmail?.message}
          />
          <Input label="Company" {...register('company')} error={errors.company?.message} />
          <Input label="Round" placeholder="e.g. L1, Technical" {...register('round')} error={errors.round?.message} />
          <Input
            label="Interview date (as on your invite)"
            type="date"
            {...register('date')}
            error={errors.date?.message}
          />
          <p className="text-[10px] text-[var(--text3)] -mt-2">
            Reference for your team; schedule time is set when they approve.
          </p>
          <Input
            label="Time slot"
            showTimeIcon
            placeholder="e.g. 10:00 AM – 11:00 AM"
            {...register('timeSlot')}
            error={errors.timeSlot?.message}
          />
          <div>
            <label className="block text-xs text-[var(--text2)] mb-1">Course</label>
            <select
              className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              {...register('course')}
            >
              <option value="">Select your course</option>
              <option value="FSD">FSD (Full Stack Development)</option>
              <option value="SDET">SDET (Automation Testing)</option>
              <option value="BI_DS">BI & Data Science</option>
              <option value="NETWORKING">Networking</option>
              <option value="AWS">AWS / Cloud</option>
              <option value="JAVA">Java Specialist</option>
              <option value="REACT">React / Frontend</option>
            </select>
            {errors.course && <p className="mt-1 text-sm text-danger">{errors.course.message}</p>}
          </div>
          <Input label="HR / contact (optional)" {...register('hrNumber')} />
          <div>
            <label className="block text-xs text-[var(--text2)] mb-1">Notes (optional)</label>
            <textarea
              className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(0,0,0,0.25)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              {...register('comments')}
            />
          </div>
          {submitMut.isError && (
            <p className="text-sm text-[var(--pink)]">
              {submitMut.error?.response?.data?.message || 'Could not submit. Check email and try again.'}
            </p>
          )}
          <Button type="submit" className="w-full" loading={submitMut.isPending}>
            Submit for approval
          </Button>
        </form>
      </div>
      <Modal
        open={showReg}
        onClose={() => setShowReg(false)}
        title="Quick Registration"
        variant="dark"
      >
        <p className="text-sm text-[var(--text2)] mb-6">
          Not in the system? Register here quickly to allow your interview submission.
        </p>

        <form onSubmit={handleSubmitReg((val) => regMut.mutate(val))} className="space-y-4">
          <Input label="Full Name" {...registerReg('name')} error={errorsReg.name?.message} />
          <Input label="Email address" {...registerReg('email')} error={errorsReg.email?.message} />
          <Input label="Phone number" {...registerReg('phone')} error={errorsReg.phone?.message} />
          
          <div>
            <label className="block text-xs text-[var(--text2)] mb-1">Course</label>
            <select
              className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              {...registerReg('course')}
            >
              <option value="FSD">FSD</option>
              <option value="SDET">SDET</option>
              <option value="BI_DS">BI_DS</option>
              <option value="NETWORKING">NETWORKING</option>
              <option value="AWS">AWS</option>
              <option value="JAVA">JAVA</option>
              <option value="REACT">REACT</option>
            </select>
            {errorsReg.course && <p className="mt-1 text-sm text-danger">{errorsReg.course.message}</p>}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowReg(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={regMut.isPending}>
              Register Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
