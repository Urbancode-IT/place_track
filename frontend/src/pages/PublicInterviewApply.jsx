import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { publicSelfInterviewApi } from '@/api/publicSelfInterview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useNotificationStore } from '@/store/notification.store';
import { InterviewRoundFields } from '@/components/interviews/InterviewRoundFields';
import { resolveSubmittedRound } from '@/constants/interviewRounds';
import { parseDateOnlyLocal, todayLocalISO, toDateOnlyISO } from '@/utils/formatDate';
import { isValidHttpUrl, normalizeMeetingLink, normalizeTimeSlot } from '@/utils/jobApplication';

const UPCOMING_SPAN_DAYS = 13;

function EyeIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function prettyDayLabel(iso) {
  const d = parseDateOnlyLocal(iso);
  if (!d) return iso || '';
  return format(d, 'dd MMM yyyy');
}

function addDaysISO(iso, days) {
  const d = parseDateOnlyLocal(iso) || new Date();
  return toDateOnlyISO(addDays(d, days));
}

const regSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  course: z.enum(['FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT'], {
    errorMap: () => ({ message: 'Select a course' })
  }),
});

const schema = z.object({
  name: z.string().min(1, 'Full Name is required'),
  studentEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  studentPhone: z.string().min(1, 'Enter your phone number').optional().or(z.literal('')),
  company: z.string().min(1, 'Company is required'),
  round: z.string().min(1, 'Round is required'),
  customRound: z.string().optional(),
  date: z.string().min(1, 'Interview date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  course: z.enum(['FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT'], {
    errorMap: () => ({ message: 'Select your course' })
  }),
  hrNumber: z.string().trim().min(1, 'HR / contact is required').max(80),
  room: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !v.trim() || isValidHttpUrl(normalizeMeetingLink(v)), {
      message: 'Paste a valid meeting URL (https://…)',
    }),
  comments: z.string().optional(),
}).refine(data => data.studentEmail || data.studentPhone, {
  message: "Provide either Email or Phone Number to identify yourself",
  path: ["studentEmail"]
}).refine(data => data.round !== 'Other' || (data.customRound && data.customRound.trim().length > 0), {
  message: "Please specify the round name",
  path: ["customRound"]
});

/**
 * Shared link for all students — same URL. Student enters institute email/phone + interview details.
 */
export default function PublicInterviewApply() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [showReg, setShowReg] = useState(false);
  const [showShed, setShowShed] = useState(false);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'upcoming'
  const [viewDate, setViewDate] = useState(() => todayLocalISO());

  const submitMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.apply(body).then((r) => r.data),
  });

  const regMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.registerStudent(body).then((r) => r.data),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Student registered! You can now submit your interview.' });
      setShowReg(false);
      resetReg();
    },
    onError: (err) => {
      addToast({ type: 'error', message: err?.response?.data?.message || 'Registration failed' });
    },
  });
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      studentEmail: '',
      studentPhone: '',
      company: '',
      round: '',
      customRound: '',
      date: '',
      timeSlot: '',
      course: '',
      hrNumber: '',
      room: '',
      comments: '',
    },
  });

  const course = useWatch({ control, name: 'course' });
  const date = useWatch({ control, name: 'date' });
  const timeSlot = useWatch({ control, name: 'timeSlot' });
  const round = useWatch({ control, name: 'round' });

  useEffect(() => {
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setViewDate(date);
    }
  }, [date]);

  const schedQuery = useQuery({
    queryKey: ['publicInterviews', viewMode, viewDate],
    queryFn: () => {
      if (viewMode === 'upcoming') {
        const from = viewDate || todayLocalISO();
        const to = addDaysISO(from, UPCOMING_SPAN_DAYS);
        return publicSelfInterviewApi
          .listInterviews(undefined, undefined, { from, to })
          .then((r) => r.data?.data || []);
      }
      return publicSelfInterviewApi
        .listInterviews(undefined, viewDate || todayLocalISO())
        .then((r) => r.data?.data || []);
    },
    enabled: showShed,
  });

  const conflictQuery = useQuery({
    queryKey: ['publicInterviewsConflict', date],
    queryFn: () =>
      publicSelfInterviewApi.listInterviews(undefined, date).then((r) => r.data?.data || []),
    enabled: Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date)),
  });

  const timeConflicts = useMemo(() => {
    const counts = {};
    schedQuery.data?.forEach((item) => {
      const day = item.date || viewDate || todayLocalISO();
      const t = normalizeTimeSlot(item.timeSlot) || 'none';
      const key = `${day}|${t}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [schedQuery.data, viewDate]);

  const chosenSlotConflict = useMemo(() => {
    const day = date;
    const t = normalizeTimeSlot(timeSlot);
    if (!day || !t) return false;
    return (conflictQuery.data || []).some(
      (item) =>
        (item.date || day) === day && normalizeTimeSlot(item.timeSlot) === t
    );
  }, [conflictQuery.data, date, timeSlot]);

  const groupedSchedule = useMemo(() => {
    const rows = schedQuery.data || [];
    if (viewMode !== 'upcoming') {
      return [{ date: viewDate || todayLocalISO(), items: rows }];
    }
    const map = new Map();
    rows.forEach((item) => {
      const key = item.date || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].map(([d, items]) => ({ date: d, items }));
  }, [schedQuery.data, viewMode, viewDate]);

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
          <h1 className="text-xl font-medium">Thank you</h1>
          <p className="text-sm text-[var(--text2)]">
            {submitMut.data?.message || 'Submitted. Your placement team will review it.'}
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = (values) => {
    if (chosenSlotConflict) {
      addToast({
        type: 'error',
        message: `Time slot "${values.timeSlot}" is already taken on ${prettyDayLabel(values.date)}. Pick another time.`,
      });
      return;
    }
    const payload = {
      ...values,
      round: resolveSubmittedRound(values.round, values.customRound),
      date: new Date(values.date).toISOString(),
    };
    if (values.room && values.room.trim()) {
      payload.room = normalizeMeetingLink(values.room);
    } else {
      delete payload.room;
    }
    delete payload.customRound;
    submitMut.mutate(payload);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 flex justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 sm:p-8 space-y-6"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">PlaceTrack</p>
            <h1 className="mt-1 text-[22px] font-medium">Interview details</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-[var(--text2)]">
                Use your <strong className="text-[var(--text)]">Email or Phone Number</strong> on file.
              </p>
              <Link
                to="/interview/finish"
                className="text-[10px] font-medium text-[var(--cyan)] hover:text-white transition-colors bg-[rgba(0,212,255,0.1)] px-2 py-1 rounded-md border border-[rgba(0,212,255,0.2)]"
              >
                Finished? Record Outcome →
              </Link>
            </div>
          </div>
          <button
            type="button"
            title="View interview schedule"
            onClick={() => setShowShed(!showShed)}
            className={`p-3 rounded-xl border transition-all mt-2 ${showShed
                ? 'bg-[var(--cyan)] border-[var(--cyan)] text-black'
                : 'bg-[rgba(255,255,255,0.03)] border-[var(--border)] text-[var(--text2)] hover:text-[var(--cyan)]'
              }`}
          >
            <EyeIcon />
          </button>
        </div>

        {showShed && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--border)] rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--cyan)]">
                Scheduled interviews
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-[9px] font-medium uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setViewMode('day')}
                    className={`px-2.5 py-1 transition-colors ${viewMode === 'day' ? 'bg-[var(--cyan)] text-black' : 'text-[var(--text2)] hover:text-[var(--cyan)]'}`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('upcoming')}
                    className={`px-2.5 py-1 transition-colors ${viewMode === 'upcoming' ? 'bg-[var(--cyan)] text-black' : 'text-[var(--text2)] hover:text-[var(--cyan)]'}`}
                  >
                    Upcoming
                  </button>
                </div>
                <label
                  className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.03)] border border-[var(--border)] rounded-lg px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-[var(--cyan)] cursor-pointer hover:bg-[rgba(255,255,255,0.06)]"
                  title="Pick a date"
                >
                  <CalendarIcon className="opacity-90" />
                  <input
                    type="date"
                    value={viewDate}
                    onChange={(e) => {
                      const next = e.target.value || todayLocalISO();
                      setViewDate(next);
                      setViewMode('day');
                    }}
                    className="bg-transparent outline-none text-[9px] uppercase tracking-wider text-[var(--cyan)] max-w-[9.5rem]"
                  />
                </label>
              </div>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              {viewMode === 'upcoming'
                ? `Showing ${prettyDayLabel(viewDate)} → ${prettyDayLabel(addDaysISO(viewDate, UPCOMING_SPAN_DAYS))}`
                : prettyDayLabel(viewDate)}
              {' · '}Same-time slots are highlighted to avoid conflicts.
            </p>
            {schedQuery.isLoading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : (schedQuery.data?.length || 0) === 0 ? (
              <p className="text-[10px] text-[var(--text3)]">No interviews scheduled yet for this selection.</p>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {groupedSchedule.map((group) => (
                  <div key={group.date} className="space-y-2">
                    {viewMode === 'upcoming' && (
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text2)] sticky top-0 bg-[rgba(0,0,0,0.35)] backdrop-blur-sm py-1 px-1 rounded">
                        {prettyDayLabel(group.date)} · {group.items.length}
                      </p>
                    )}
                    {group.items.map((item) => {
                      const initial = item.studentName?.charAt(0).toUpperCase() || 'S';
                      const colors = ['bg-emerald-500/20 text-emerald-400', 'bg-purple-500/20 text-purple-400', 'bg-rose-500/20 text-rose-400', 'bg-amber-500/20 text-amber-400'];
                      const colorClass = colors[item.studentName?.length % colors.length];
                      const day = item.date || group.date;
                      const normalizedTime = normalizeTimeSlot(item.timeSlot) || 'none';
                      const hasConflict = (timeConflicts[`${day}|${normalizedTime}`] || 0) > 1;

                      return (
                        <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${hasConflict
                            ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15 ring-1 ring-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                            : 'bg-[rgba(255,255,255,0.03)] border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)]'
                          }`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-medium text-lg border border-white/5 ${colorClass}`}>
                            {initial}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text)] truncate">{item.studentName}</p>
                            <p className="text-[11px] text-[var(--text2)] truncate">{item.company} • <span className="text-[var(--text3)]">{item.studentCourse}</span></p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                            <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-[var(--cyan)]">
                              {item.round}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[var(--text2)]">{item.timeSlot}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-widest ${item.pending ? 'bg-primary/80 text-white' : 'bg-emerald-500 text-white'
                                }`}>
                                {item.pending ? 'PENDING' : 'READY'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px] text-[var(--text3)] italic">Schedule updates live as placement team approves requests.</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          {course && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
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
              {chosenSlotConflict && (
                <p className="text-[11px] text-rose-400 -mt-2">
                  This time conflicts with another interview on {prettyDayLabel(date)}. Choose a different slot.
                </p>
              )}

              <Input
                label="Full Name"
                placeholder="Enter your name"
                {...register('name')}
                error={errors.name?.message}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your email (optional)"
                  type="email"
                  placeholder="email@example.com"
                  autoComplete="email"
                  {...register('studentEmail')}
                  error={errors.studentEmail?.message}
                />
                <Input
                  label="Phone number"
                  type="tel"
                  placeholder="10 digit number"
                  {...register('studentPhone')}
                  error={errors.studentPhone?.message}
                />
              </div>

              <Input label="Company" {...register('company')} error={errors.company?.message} />

              <InterviewRoundFields register={register} errors={errors} watchRound={round} />

              <Input
                label="Meeting link (optional)"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="Paste Zoom, Meet, or Teams URL"
                {...register('room')}
                error={errors.room?.message}
              />
              <p className="text-[11px] text-[var(--text3)] -mt-2">
                Paste the link from your invite (if available). Match the company, date, and time your SPOC logged.
              </p>

              <Input
                label="HR / contact"
                placeholder="HR name / phone / email"
                {...register('hrNumber')}
                error={errors.hrNumber?.message}
              />
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
                  {submitMut.error?.response?.data?.message || submitMut.error?.message || 'Submission failed. Please check your details.'}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                loading={submitMut.isPending}
                disabled={chosenSlotConflict}
              >
                Submit for approval
              </Button>
            </div>
          )}
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
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email (optional)" placeholder="email@example.com" {...registerReg('email')} error={errorsReg.email?.message} />
            <Input label="Phone number" placeholder="10 digit number" {...registerReg('phone')} error={errorsReg.phone?.message} />
          </div>

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
