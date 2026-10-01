import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { TimePickerField } from '@/components/ui/TimePickerField';
import { COURSE_SELECT_OPTIONS } from '@/utils/constants';
import { useJobApplicationStudents } from '@/hooks/useJobApplications';
import { studentApi } from '@/api/student.api';
import {
  normalizePortalName,
  uniqueCanonicalPortals,
  createEmptyInterviewSlot,
  syncInterviewSlots,
  hydrateInterviewSlots,
  formatDateOnlyLabel,
  APPLICATION_COUNT_MAX,
  CALLS_RECEIVED_MAX,
  INTERVIEWS_SCHEDULED_MAX,
} from '@/utils/jobApplication';

const slotSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(1, 'Company is required').max(200),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required')
    .refine((value) => {
      const [y, m, d] = value.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    }, 'Invalid calendar date'),
  timeSlot: z.string().min(1, 'Time is required').max(80),
});

const schema = z
  .object({
    studentId: z.string().optional().default(''),
    studentName: z.string().trim().min(2, 'Enter a student name').max(100),
    portal: z.string().min(1, 'Portal is required').max(100),
    applicationCount: z.coerce
      .number()
      .int()
      .min(0, 'Must be 0 or more')
      .max(APPLICATION_COUNT_MAX, `Applications cannot exceed ${APPLICATION_COUNT_MAX}`),
    callsReceived: z.coerce
      .number()
      .int()
      .min(0, 'Must be 0 or more')
      .max(CALLS_RECEIVED_MAX, `Calls received cannot exceed ${CALLS_RECEIVED_MAX}`),
    interviewsScheduled: z.coerce
      .number()
      .int()
      .min(0, 'Must be 0 or more')
      .max(
        INTERVIEWS_SCHEDULED_MAX,
        `Interviews scheduled cannot exceed ${INTERVIEWS_SCHEDULED_MAX}`
      ),
    interviewSlots: z.array(slotSchema).max(INTERVIEWS_SCHEDULED_MAX).default([]),
  })
  .superRefine((data, ctx) => {
    const portal = normalizePortalName(data.portal);
    if (!portal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Portal is required',
        path: ['portal'],
      });
    }
    const count = Number(data.interviewsScheduled) || 0;
    if (count <= 0) return;
    if (data.interviewSlots.length !== count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Add ${count} interview slot${count === 1 ? '' : 's'}`,
        path: ['interviewSlots'],
      });
      return;
    }
    const seen = new Map();
    data.interviewSlots.forEach((slot, index) => {
      const key = `${slot.date}|${String(slot.timeSlot || '')
        .trim()
        .toLowerCase()
        .split(/\s*[–-]\s*/)[0]
        .trim()}`;
      if (!slot.date || !slot.timeSlot) return;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Two interviews on the same day need different times',
          path: ['interviewSlots', index, 'timeSlot'],
        });
      } else {
        seen.set(key, index);
      }
    });
  });

const EMPTY_STUDENTS = [];
const INTERVIEW_SAVE_MS = 600;
const STUDENT_SAVE_MS = 600;

function slotSignature(slot) {
  const company = String(slot?.companyName || '').trim();
  const date = String(slot?.date || '').trim();
  const time = String(slot?.timeSlot || '').trim();
  if (!company || !date || !time) return '';
  return `${company}|${date}|${time}`;
}

function clampCountRegister(register, name, max) {
  const reg = register(name);
  return {
    ...reg,
    onChange: (event) => {
      const raw = event.target.value;
      if (raw !== '' && Number.isFinite(Number(raw))) {
        const n = Math.trunc(Number(raw));
        if (n > max) event.target.value = String(max);
        else if (n < 0) event.target.value = '0';
      }
      return reg.onChange(event);
    },
  };
}

function readCountInput(formEl, name) {
  const input = formEl?.elements?.namedItem?.(name);
  if (!input || !('value' in input)) return null;
  const raw = String(input.value ?? '');
  if (raw === '') return 0;
  const next = Number(raw);
  return Number.isFinite(next) ? next : null;
}

function slotsFromInitial(initial, defaultDate) {
  const hydrated = hydrateInterviewSlots(initial || {});
  if (hydrated.length) {
    return hydrated.map((s) => ({
      id: s.id || createEmptyInterviewSlot(s.date || defaultDate).id,
      companyName: s.companyName,
      date: s.date || defaultDate,
      timeSlot: s.timeSlot,
    }));
  }
  const count = Number(initial?.interviewsScheduled) || 0;
  if (count <= 0) return [];
  return syncInterviewSlots([], count, defaultDate).map((slot, i) =>
    i === 0 && initial?.companyName
      ? { ...slot, companyName: initial.companyName, date: defaultDate }
      : { ...slot, date: defaultDate }
  );
}

export function JobApplicationFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  initial,
  spocUserId,
  portalSuggestions = [],
  defaultDate,
  title = 'Add application entry',
}) {
  const [courseValue, setCourseValue] = useState('');
  const [courseError, setCourseError] = useState('');
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [studentStatus, setStudentStatus] = useState('');
  const isEditing = Boolean(initial?.id);
  const queryClient = useQueryClient();
  const savedStudentKeyRef = useRef('');
  const savedSigRef = useRef({});
  const editingByIdRef = useRef({});
  const [savedById, setSavedById] = useState({});
  const [editingById, setEditingById] = useState({});
  editingByIdRef.current = editingById;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: '',
      studentName: '',
      portal: '',
      applicationCount: 0,
      callsReceived: 0,
      interviewsScheduled: 0,
      interviewSlots: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'interviewSlots',
    keyName: 'fieldId',
  });

  const interviewsScheduled = Number(watch('interviewsScheduled') || 0);
  const portalValue = watch('portal');
  const studentNameValue = watch('studentName') || '';
  const interviewSlots = watch('interviewSlots') || [];

  useEffect(() => {
    if (!open) {
      setCourseValue('');
      setCourseError('');
      setStudentMenuOpen(false);
      setStudentStatus('');
      savedStudentKeyRef.current = '';
      savedSigRef.current = {};
      setSavedById({});
      setEditingById({});
      return;
    }
    setCourseError('');
    setStudentMenuOpen(false);
    setStudentStatus('');
    savedStudentKeyRef.current = '';
    setCourseValue(initial?.id && initial?.student?.course ? initial.student.course : '');
    const slots = slotsFromInitial(initial, initial?.date || defaultDate);
    reset({
      studentId: initial?.studentId || '',
      studentName: initial?.student?.name || '',
      portal: initial?.portal || '',
      applicationCount: initial?.applicationCount ?? 0,
      callsReceived: initial?.callsReceived ?? 0,
      interviewsScheduled: initial?.interviewsScheduled ?? slots.length,
      interviewSlots: slots,
    });
    const seeded = {};
    for (const slot of slots) {
      const sig = slotSignature(slot);
      if (!slot.id || !sig) continue;
      seeded[slot.id] = sig;
    }
    savedSigRef.current = seeded;
    setSavedById(seeded);
    setEditingById({});
  }, [open, initial, reset, defaultDate]);

  useEffect(() => {
    if (!open) return;
    const current = getValues('interviewSlots') || [];
    const next = syncInterviewSlots(current, interviewsScheduled, defaultDate);
    if (next.length === current.length) return;
    replace(next);
  }, [open, interviewsScheduled, defaultDate, getValues, replace]);

  const companyDigest = interviewSlots
    .map((slot) => `${slot?.id || ''}|${String(slot?.companyName || '').trim()}`)
    .join('\n');

  useEffect(() => {
    if (!open) return undefined;
    const slots = getValues('interviewSlots') || [];
    const timers = [];
    for (const slot of slots) {
      const id = slot?.id;
      if (!id || editingByIdRef.current[id]) continue;
      const company = String(slot?.companyName || '').trim();
      if (!company) continue;
      const sig = slotSignature(slot);
      if (!sig || savedSigRef.current[id] === sig) continue;
      timers.push(
        setTimeout(() => {
          const latest = (getValues('interviewSlots') || []).find((item) => item?.id === id);
          const latestSig = slotSignature(latest);
          if (!latestSig || latestSig !== sig) return;
          savedSigRef.current[id] = latestSig;
          setSavedById((prev) => ({ ...prev, [id]: latestSig }));
        }, INTERVIEW_SAVE_MS)
      );
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, companyDigest, getValues]);

  const deleteSlot = (index) => {
    const current = getValues('interviewSlots') || [];
    const slot = current[index];
    if (!slot) return;
    if (!window.confirm('Delete this interview?')) return;
    const next = current.filter((_, i) => i !== index);
    replace(next);
    setValue('interviewsScheduled', next.length, { shouldValidate: true, shouldDirty: true });
    if (slot.id) {
      const saved = { ...savedSigRef.current };
      delete saved[slot.id];
      savedSigRef.current = saved;
      setSavedById(saved);
      setEditingById((prev) => {
        if (!prev[slot.id]) return prev;
        const copy = { ...prev };
        delete copy[slot.id];
        return copy;
      });
    }
  };

  const editSlot = (id) => {
    if (!id) return;
    setEditingById((prev) => ({ ...prev, [id]: true }));
  };

  const saveSlot = async (index) => {
    const valid = await trigger([
      `interviewSlots.${index}.companyName`,
      `interviewSlots.${index}.date`,
      `interviewSlots.${index}.timeSlot`,
    ]);
    if (!valid) return;
    const slot = (getValues('interviewSlots') || [])[index];
    const id = slot?.id;
    const sig = slotSignature(slot);
    if (!id || !sig) return;
    savedSigRef.current = { ...savedSigRef.current, [id]: sig };
    setSavedById((prev) => ({ ...prev, [id]: sig }));
    setEditingById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const { data: studentsRes, isLoading: studentsLoading, isFetching: studentsFetching } =
    useJobApplicationStudents({
      spocUserId: spocUserId || undefined,
      enabled: Boolean(open && spocUserId),
    });

  const students = studentsRes?.data ?? EMPTY_STUDENTS;

  const courseOptions = useMemo(
    () =>
      COURSE_SELECT_OPTIONS.map((course) => ({
        value: course.value,
        label: course.label,
      })),
    []
  );

  const knownStudents = useMemo(() => {
    const byId = new Map();
    for (const student of students) {
      if (!student?.id) continue;
      byId.set(String(student.id), student);
    }
    if (initial?.studentId && initial?.student && !byId.has(String(initial.studentId))) {
      byId.set(String(initial.studentId), {
        id: initial.studentId,
        name: initial.student.name,
        course: initial.student.course,
      });
    }
    return [...byId.values()];
  }, [students, initial?.studentId, initial?.student]);

  const typedStudentName = String(studentNameValue || '').trim();
  const exactStudent = knownStudents.find(
    (student) => String(student.name || '').trim().toLowerCase() === typedStudentName.toLowerCase()
  );
  const needsNewStudent = typedStudentName.length >= 2 && !exactStudent;

  const studentMatches = useMemo(() => {
    const query = typedStudentName.toLowerCase();
    return knownStudents
      .filter((student) => !query || String(student.name || '').toLowerCase().includes(query))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .slice(0, 8);
  }, [knownStudents, typedStudentName]);

  useEffect(() => {
    if (!open) return undefined;
    const name = typedStudentName;
    if (name.length < 2) {
      setStudentStatus('');
      return undefined;
    }
    const timer = setTimeout(() => {
      const latest = String(getValues('studentName') || '').trim();
      if (latest !== name) return;
      const exact = knownStudents.find(
        (student) => String(student.name || '').trim().toLowerCase() === name.toLowerCase()
      );
      if (exact?.id) {
        savedStudentKeyRef.current = `${exact.id}|${name.toLowerCase()}`;
        setValue('studentId', String(exact.id), { shouldDirty: true, shouldValidate: true });
        setStudentStatus('saved');
        return;
      }
      const currentId = String(getValues('studentId') || '');
      const key = `${currentId || 'new'}|${name.toLowerCase()}`;
      if (savedStudentKeyRef.current === key) {
        setStudentStatus('saved');
        return;
      }
      savedStudentKeyRef.current = key;
      if (isEditing && currentId) {
        setStudentStatus('saving');
        studentApi
          .update(currentId, { name })
          .then(() => {
            if (String(getValues('studentName') || '').trim() !== name) return;
            setStudentStatus('saved');
            queryClient.invalidateQueries({ queryKey: ['job-applications', 'students'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
          })
          .catch(() => {
            if (savedStudentKeyRef.current === key) savedStudentKeyRef.current = '';
            setStudentStatus('');
          });
        return;
      }
      setValue('studentId', '', { shouldDirty: true });
      setStudentStatus('saved');
    }, STUDENT_SAVE_MS);
    return () => clearTimeout(timer);
  }, [open, typedStudentName, knownStudents, isEditing, getValues, setValue, queryClient]);

  const portalOptions = useMemo(() => {
    const list = uniqueCanonicalPortals([
      ...portalSuggestions,
      ...(portalValue ? [portalValue] : []),
    ]);
    return list
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({ value: p, label: p }));
  }, [portalSuggestions, portalValue]);

  const sameDay = useMemo(() => {
    if (interviewSlots.length < 2) return false;
    const dates = interviewSlots.map((s) => s.date).filter(Boolean);
    return dates.length >= 2 && dates.every((d) => d === dates[0]);
  }, [interviewSlots]);

  const submit = async (form) => {
    const count = Number(form.interviewsScheduled);
    const slots =
      count > 0
        ? (form.interviewSlots || []).slice(0, count).map((slot) => ({
            id: slot.id,
            companyName: (slot.companyName || '').trim(),
            date: slot.date,
            timeSlot: (slot.timeSlot || '').trim(),
          }))
        : [];
    const name = String(form.studentName || '').trim();
    const exact = knownStudents.find(
      (student) => String(student.name || '').trim().toLowerCase() === name.toLowerCase()
    );
    const addingNew = !exact;
    if ((addingNew || isEditing) && !courseValue) {
      setCourseError('Course is required');
      return;
    }
    const base = {
      date: initial?.date || defaultDate,
      portal: normalizePortalName(form.portal),
      applicationCount: Number(form.applicationCount),
      callsReceived: Number(form.callsReceived),
      interviewsScheduled: count,
      interviewSlots: slots,
    };
    if (exact?.id) {
      onSubmit({
        ...base,
        studentId: exact.id,
        ...(isEditing && courseValue ? { course: courseValue } : {}),
      });
      return;
    }
    if (isEditing && form.studentId) {
      try {
        await studentApi.update(String(form.studentId), { name });
      } catch {
        setStudentStatus('');
      }
      onSubmit({
        ...base,
        studentId: form.studentId,
        ...(courseValue ? { course: courseValue } : {}),
      });
      return;
    }
    onSubmit({
      ...base,
      studentName: name,
      course: courseValue,
    });
  };

  const submitCountsFromForm = (event) => {
    const formEl = event.currentTarget;
    for (const name of ['applicationCount', 'callsReceived', 'interviewsScheduled']) {
      const next = readCountInput(formEl, name);
      if (next == null) continue;
      const current = Number(getValues(name));
      if (current === next) continue;
      setValue(name, next, { shouldDirty: true, shouldValidate: false });
    }
    handleSubmit(submit)(event);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" variant="dark">
      <form onSubmit={submitCountsFromForm} className="space-y-4">
        <SearchableSelect
          label="Course"
          options={courseOptions}
          value={courseValue}
          onChange={(e) => {
            setCourseValue(e.target.value);
            if (e.target.value) setCourseError('');
          }}
          searchable
          searchPlaceholder="Search course…"
          placeholder="Select course"
          required={isEditing || needsNewStudent}
          error={courseError}
          maxMenuHeight={140}
          hint={
            isEditing
              ? 'Updates this student’s course when you save'
              : 'Required only when you add a new student name'
          }
        />

        <div className="relative">
          <Input
            label="Student"
            required
            value={studentNameValue}
            onChange={(e) => {
              setValue('studentName', e.target.value, { shouldDirty: true, shouldValidate: false });
              setStudentStatus('');
              setStudentMenuOpen(true);
            }}
            onFocus={() => setStudentMenuOpen(true)}
            onBlur={() => setStudentMenuOpen(false)}
            placeholder={studentsLoading || studentsFetching ? 'Loading students…' : 'Type student name'}
            autoComplete="off"
            spellCheck={false}
            error={errors.studentName?.message}
          />
          {studentStatus === 'saving' || studentStatus === 'saved' ? (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-[var(--text3)]">
              {studentStatus === 'saving' ? 'Saving…' : 'Saved'}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--text3)]">
              Type the name you want. It is saved shortly after you pause, and you can edit it later.
            </p>
          )}
          {studentMenuOpen && studentMatches.length > 0 ? (
            <div
              className="absolute left-0 right-0 z-50 mt-1 rounded-xl border overflow-hidden"
              style={{
                background: 'rgba(10,13,24,0.96)',
                borderColor: 'rgba(0, 212, 255, 0.28)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              }}
              role="listbox"
            >
              <div className="overflow-y-auto p-1" style={{ maxHeight: 140 }}>
                {studentMatches.map((student) => (
                  <button
                    key={String(student.id)}
                    type="button"
                    role="option"
                    className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-[var(--text2)] hover:text-[var(--text)] truncate"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const name = String(student.name || '').trim();
                      savedStudentKeyRef.current = `${student.id}|${name.toLowerCase()}`;
                      setValue('studentName', name, { shouldDirty: true, shouldValidate: true });
                      setValue('studentId', String(student.id), { shouldDirty: true, shouldValidate: true });
                      setStudentStatus('saved');
                      setStudentMenuOpen(false);
                    }}
                  >
                    {student.course ? `${student.name} (${student.course})` : student.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Controller
          name="portal"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label="Job portal"
              required
              options={portalOptions}
              value={field.value}
              onChange={(e) =>
                field.onChange(normalizePortalName(e.target.value) || e.target.value)
              }
              searchable
              allowCustom
              searchPlaceholder="Search or type portal…"
              placeholder="e.g. Naukri, LinkedIn"
              error={errors.portal?.message}
              maxMenuHeight={140}
            />
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Applications"
            required
            type="number"
            min={0}
            max={APPLICATION_COUNT_MAX}
            error={errors.applicationCount?.message}
            {...clampCountRegister(register, 'applicationCount', APPLICATION_COUNT_MAX)}
          />
          <Input
            label="Calls received"
            type="number"
            min={0}
            max={CALLS_RECEIVED_MAX}
            error={errors.callsReceived?.message}
            {...clampCountRegister(register, 'callsReceived', CALLS_RECEIVED_MAX)}
          />
          <Input
            label="Interviews scheduled"
            type="number"
            min={0}
            max={INTERVIEWS_SCHEDULED_MAX}
            error={errors.interviewsScheduled?.message}
            {...clampCountRegister(register, 'interviewsScheduled', INTERVIEWS_SCHEDULED_MAX)}
          />
        </div>

        {interviewsScheduled > 0 && (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--text2)]">Interview slots</p>
                <p className="text-[11px] text-[var(--text3)] mt-0.5">
                  Company, date, and time. The company name saves shortly after you stop typing.
                  Use Save to keep the date and time.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--cyan)]">
                {fields.length} of {interviewsScheduled}
              </span>
            </div>

            {sameDay ? (
              <p
                className="text-[11px] rounded-lg px-3 py-2"
                style={{
                  color: 'var(--cyan)',
                  background:
                    'linear-gradient(135deg, rgba(0,212,255,0.10), rgba(0,168,204,0.06))',
                  border: '1px solid rgba(0, 212, 255, 0.22)',
                }}
              >
                Same day is fine — give each interview a different time.
              </p>
            ) : null}

            {fields.map((field, index) => {
              const slot = interviewSlots[index] || {};
              const slotId = slot.id || field.id;
              const sig = slotSignature(slot);
              const savedSig = savedById[slotId];
              const isSavedView = Boolean(savedSig) && savedSig === sig && !editingById[slotId];
              return (
              <div
                key={field.fieldId || field.id}
                className="rounded-xl border p-3 space-y-3 overflow-hidden"
                style={{
                  borderColor: 'rgba(0, 212, 255, 0.18)',
                  background: 'rgba(12, 16, 28, 0.45)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--cyan)]">
                    Interview {index + 1}
                    {interviewsScheduled > 1 ? ` of ${interviewsScheduled}` : ''}
                  </p>
                  {isSavedView ? (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      Saved
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--cyan)] hover:bg-[rgba(0,212,255,0.12)]"
                        onClick={() => saveSlot(index)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--pink)] hover:bg-[rgba(244,63,94,0.12)]"
                        onClick={() => deleteSlot(index)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {isSavedView ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text)] truncate">{slot.companyName}</p>
                      <p className="mt-0.5 text-xs text-[var(--text2)] tabular-nums">
                        {formatDateOnlyLabel(slot.date, 'dd-MM-yyyy')}
                        {slot.timeSlot ? ` · ${slot.timeSlot}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--cyan)] hover:bg-[rgba(0,212,255,0.12)]"
                        onClick={() => editSlot(slotId)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--pink)] hover:bg-[rgba(244,63,94,0.12)]"
                        onClick={() => deleteSlot(index)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Input
                      label="Company"
                      required
                      placeholder="e.g. Infosys"
                      autoComplete="off"
                      spellCheck={false}
                      error={errors.interviewSlots?.[index]?.companyName?.message}
                      {...register(`interviewSlots.${index}.companyName`)}
                      className="slot-quiet-input focus:ring-0 focus:border-[rgba(0,212,255,0.45)]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Controller
                        name={`interviewSlots.${index}.date`}
                        control={control}
                        render={({ field: dateField }) => (
                          <DatePickerField
                            label="Date"
                            required
                            value={dateField.value}
                            onChange={dateField.onChange}
                            error={errors.interviewSlots?.[index]?.date?.message}
                          />
                        )}
                      />
                      <Controller
                        name={`interviewSlots.${index}.timeSlot`}
                        control={control}
                        render={({ field: timeField }) => (
                          <TimePickerField
                            label="Time"
                            required
                            value={timeField.value}
                            onChange={timeField.onChange}
                            placeholder="e.g. 10:00 AM"
                            error={errors.interviewSlots?.[index]?.timeSlot?.message}
                          />
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
              );
            })}
            {errors.interviewSlots?.message || errors.interviewSlots?.root?.message ? (
              <p className="text-sm text-danger">
                {errors.interviewSlots?.message || errors.interviewSlots?.root?.message}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {initial?.id ? 'Save changes' : 'Add entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
