import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { JobApplicationFormModal } from './JobApplicationFormModal';
import { InterviewSlotsSummary } from './InterviewSlotsSummary';
import { COURSE_COLORS, JOB_APPLICATION_PORTALS } from '@/utils/constants';
import { todayLocalISO } from '@/utils/formatDate';
import {
  isDateOnly,
  isUuid,
  normalizePortalName,
  uniqueCanonicalPortals,
} from '@/utils/jobApplication';
import {
  useJobApplicationDaily,
  useJobApplicationPortals,
  useCreateJobApplication,
  useUpdateJobApplication,
  useDeleteJobApplication,
} from '@/hooks/useJobApplications';
import { studentApi } from '@/api/student.api';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';
import { useModulePath } from '@/lib/modulePath';
import { useQueryClient } from '@tanstack/react-query';

const GRADIENT_BTN = {
  background: 'linear-gradient(135deg, #00D4FF, #00a8cc)',
  boxShadow: '0 0 20px rgba(0,212,255,0.35)',
  border: 'none',
};

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function saveErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message;
      } catch {
        /* proxy returned non-JSON */
      }
    }
  }
  if (!error?.response) return 'Could not reach the server. Try again.';
  return fallback;
}

export function DailyEntry({ spocs = [], spocsLoading }) {
  const user = useAuthStore((s) => s.user);
  const to = useModulePath();
  const addToast = useNotificationStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const isTrainer = user?.role === 'TRAINER';
  const [searchParams, setSearchParams] = useSearchParams();

  const [date, setDate] = useState(() => {
    const fromUrl = searchParams.get('date');
    return isDateOnly(fromUrl) ? fromUrl : todayLocalISO();
  });
  const [spocUserId, setSpocUserId] = useState(() => {
    if (isTrainer) return user?.id || '';
    const fromUrl = searchParams.get('spocUserId');
    return isUuid(fromUrl) ? fromUrl : '';
  });
  const [rowFilter, setRowFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [overwrite, setOverwrite] = useState(null);
  const editConsumed = useRef(false);

  useEffect(() => {
    if (isTrainer && user?.id) setSpocUserId(user.id);
  }, [isTrainer, user?.id]);

  useEffect(() => {
    if (isTrainer || spocsLoading || !spocUserId) return;
    if (!spocs.some((s) => s.id === spocUserId)) setSpocUserId('');
  }, [isTrainer, spocUserId, spocs, spocsLoading]);

  const effectiveSpocId = isTrainer ? user?.id || '' : spocUserId;

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (date) next.set('date', date);
        else next.delete('date');
        if (!isTrainer && effectiveSpocId) next.set('spocUserId', effectiveSpocId);
        else next.delete('spocUserId');
        if (next.toString() === prev.toString()) return prev;
        return next;
      },
      { replace: true }
    );
  }, [date, effectiveSpocId, isTrainer, setSearchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get('date');
    if (isDateOnly(fromUrl) && fromUrl !== date) {
      setDate(fromUrl);
    }
    if (isTrainer || spocsLoading) return;
    const spocFromUrl = searchParams.get('spocUserId');
    if (!isUuid(spocFromUrl) || spocFromUrl === spocUserId) return;
    if (!spocs.some((s) => s.id === spocFromUrl)) return;
    setSpocUserId(spocFromUrl);
  }, [searchParams, date, isTrainer, spocUserId, spocs, spocsLoading]);

  const { data, isLoading, isError, error, isFetching, refetch } = useJobApplicationDaily({
    date,
    spocUserId: effectiveSpocId,
    allSpocs: !isTrainer,
  });
  const { data: portalsRes } = useJobApplicationPortals();
  const createMut = useCreateJobApplication();
  const updateMut = useUpdateJobApplication();
  const deleteMut = useDeleteJobApplication();

  const payload = data?.data;
  const rows = payload?.rows || [];
  const loadedSpoc =
    payload?.spoc ||
    spocs.find((s) => s.id === effectiveSpocId) ||
    (isTrainer && effectiveSpocId && user?.id === effectiveSpocId ? user : null);
  const totals = useMemo(() => {
    if (payload?.totals) return payload.totals;
    return rows.reduce(
      (acc, row) => {
        acc.applicationCount += row.applicationCount || 0;
        acc.callsReceived += row.callsReceived || 0;
        acc.interviewsScheduled += row.interviewsScheduled || 0;
        return acc;
      },
      { applicationCount: 0, callsReceived: 0, interviewsScheduled: 0 }
    );
  }, [payload, rows]);

  const portalSuggestions = useMemo(
    () => uniqueCanonicalPortals([...JOB_APPLICATION_PORTALS, ...(portalsRes?.data || [])]),
    [portalsRes?.data]
  );

  const filteredRows = useMemo(() => {
    const q = rowFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.student?.name,
        row.student?.course,
        row.portal,
        row.companyName,
        row.interview?.company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, rowFilter]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || editConsumed.current || !payload) return;
    const row = rows.find((r) => r.id === editId);
    editConsumed.current = true;
    if (row) {
      setEditing(row);
      setModalOpen(true);
    } else {
      addToast({
        type: 'error',
        message: 'Could not open that entry for this date and SPOC.',
      });
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('edit');
        return next;
      },
      { replace: true }
    );
  }, [payload, rows, searchParams, setSearchParams, addToast]);

  const admittedSpocs = useMemo(() => spocs.filter((s) => s?.id), [spocs]);
  const spocOptions = useMemo(
    () => [
      ...(admittedSpocs.length ? [{ value: '', label: 'All SPOCs' }] : []),
      ...admittedSpocs.map((s) => ({ value: s.id, label: s.name })),
    ],
    [admittedSpocs]
  );
  const showSpocColumn = !isTrainer && !effectiveSpocId;
  const noAllowedTrainers = !isTrainer && !spocsLoading && admittedSpocs.length === 0;

  const openAdd = () => {
    if (!date) {
      addToast({ type: 'error', message: 'Select a date first.' });
      return;
    }
    if (noAllowedTrainers || !effectiveSpocId) {
      addToast({ type: 'error', message: 'Select a SPOC first.' });
      return;
    }
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const persist = (body, id) => {
    const { course: nextCourse, ...entryBody } = body;
    const payload = body.studentName ? { ...entryBody, course: nextCourse } : entryBody;
    const studentId = entryBody.studentId;
    const previousCourse = editing?.student?.course;

    const onSuccess = async () => {
      // Course lives on Student, not JobApplicationDaily — update it after the entry saves.
      if (
        id &&
        nextCourse &&
        studentId &&
        nextCourse !== previousCourse
      ) {
        try {
          await studentApi.update(studentId, { course: nextCourse });
          queryClient.invalidateQueries({ queryKey: ['job-applications'] });
          queryClient.invalidateQueries({ queryKey: ['students'] });
        } catch (e) {
          addToast({
            type: 'error',
            message: saveErrorMessage(e, 'Entry saved, but course could not be updated'),
          });
          setModalOpen(false);
          setEditing(null);
          setOverwrite(null);
          return;
        }
      }
      addToast({
        type: 'success',
        message: id ? 'Entry updated' : 'Entry saved',
      });
      setModalOpen(false);
      setEditing(null);
      setOverwrite(null);
    };
    const onError = (e) => {
      const existingId = e?.response?.data?.data?.id;
      if (!id && e?.response?.status === 409 && existingId) {
        setOverwrite({ body, existingId });
        return;
      }
      const message = saveErrorMessage(e, 'Failed to save entry');
      const alreadyShown = useNotificationStore
        .getState()
        .toasts.some((toast) => toast.type === 'error' && toast.message === message);
      if (alreadyShown) return;
      addToast({ type: 'error', message });
    };

    if (id) {
      updateMut.mutate({ id, data: entryBody }, { onSuccess, onError });
    } else {
      createMut.mutate(payload, { onSuccess, onError });
    }
  };

  const handleSave = (form) => {
    if (createMut.isPending || updateMut.isPending) return;
    const portal = normalizePortalName(form.portal);
    const body = {
      ...form,
      portal,
      date,
      ...(effectiveSpocId ? { spocUserId: effectiveSpocId } : {}),
    };
    if (!editing?.id) {
      const dup = rows.find(
        (row) =>
          row.studentId === form.studentId &&
          normalizePortalName(row.portal).toLowerCase() === portal.toLowerCase()
      );
      if (dup) {
        setOverwrite({ body, existingId: dup.id });
        return;
      }
    }
    persist(body, editing?.id);
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete entry for ${row.student?.name || 'student'} on ${date}?`)) return;
    deleteMut.mutate(row.id, {
      onSuccess: () => addToast({ type: 'success', message: 'Entry deleted' }),
      onError: (e) =>
        addToast({
          type: 'error',
          message: e?.response?.data?.message || 'Failed to delete',
        }),
    });
  };

  const showInitialLoader = isLoading && !rows.length;
  const isFiltered = Boolean(rowFilter.trim());

  return (
    <div className="space-y-4">
      <div className="job-apps-filter-row">
        <div>
          <DatePickerField
            label="Date"
            variant="field"
            value={date}
            onChange={setDate}
          />
        </div>
        <div>
          {isTrainer ? (
            <Input label="SPOC" value={user?.name || ''} disabled />
          ) : (
            <SearchableSelect
              label="SPOC"
              options={spocOptions}
              value={effectiveSpocId}
              onChange={(e) => setSpocUserId(e.target.value)}
              searchable
              searchPlaceholder="Search SPOC…"
              placeholder={
                spocsLoading ? 'Loading…' : noAllowedTrainers ? 'No admitted trainers' : 'All SPOCs'
              }
              disabled={spocsLoading || noAllowedTrainers}
              maxMenuHeight={160}
            />
          )}
          {noAllowedTrainers ? (
            <p className="mt-1 text-[11px] text-[var(--text3)]">
              No admitted trainers yet. Add a trainer on the Trainers page.
            </p>
          ) : (
          <p className="mt-1 text-[11px] text-[var(--text3)]">
            Loaded:{' '}
            <span className="text-[var(--cyan)]">
              {loadedSpoc?.name || (effectiveSpocId ? 'selected SPOC' : 'all SPOCs')}
            </span>
          </p>
          )}
        </div>
        <div>
          <Input
            label="Filter rows"
            type="search"
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value)}
            placeholder="Student, portal, company…"
            disabled={!rows.length && !rowFilter}
          />
          {isFiltered ? (
            <p className="mt-1 text-[11px] text-[var(--text3)]">
              Showing {filteredRows.length} of {rows.length}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--text3)]">Search this day’s rows</p>
          )}
        </div>
        <div className="job-apps-filter-action">
          <Button
            type="button"
            onClick={openAdd}
            disabled={noAllowedTrainers}
            className="text-white job-apps-add-btn"
            style={GRADIENT_BTN}
          >
            + Add entry
          </Button>
        </div>
      </div>

      {isFetching && !showInitialLoader ? (
        <p className="text-xs text-[var(--text3)]">Updating…</p>
      ) : null}

      {showInitialLoader ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl border p-6 text-center space-y-3"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm text-[var(--text2)]">
            {error?.response?.data?.message || 'Could not load daily entries.'}
          </p>
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr
                  className="text-left text-[var(--text3)] text-[10px] uppercase tracking-wider border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <th className="p-3">Student</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Portal</th>
                  {showSpocColumn ? <th className="p-3">SPOC</th> : null}
                  <th className="p-3 text-right">Applications</th>
                  <th className="p-3 text-right">Calls</th>
                  <th className="p-3 text-right">Interviews</th>
                  <th className="p-3">Interview slots</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={showSpocColumn ? 9 : 8} className="p-8 text-center text-[var(--text3)] text-sm">
                      {isFiltered
                        ? 'No rows match this filter.'
                        : effectiveSpocId
                          ? 'No entries for this date and SPOC. Add the first row to start tracking.'
                          : 'No entries for this date.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t hover:bg-[rgba(255,255,255,0.03)]"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="p-3">
                        <Link
                          to={to(`/students/${row.studentId}`)}
                          className="text-[var(--cyan)] hover:underline font-medium"
                        >
                          {row.student?.name || '—'}
                        </Link>
                      </td>
                      <td className="p-3">
                        {row.student?.course ? (
                          <Badge className={COURSE_COLORS[row.student.course]}>
                            {row.student.course}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-[var(--text)]">{row.portal}</td>
                      {showSpocColumn ? (
                        <td className="p-3 text-[var(--text2)]">{row.spoc?.name || '—'}</td>
                      ) : null}
                      <td className="p-3 text-right tabular-nums">{row.applicationCount}</td>
                      <td className="p-3 text-right tabular-nums">{row.callsReceived}</td>
                      <td className="p-3 text-right tabular-nums">{row.interviewsScheduled}</td>
                      <td className="p-3 text-[var(--text2)] max-w-[240px]">
                        <InterviewSlotsSummary row={row} />
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            aria-label="Edit"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--cyan)] transition-colors hover:bg-[rgba(0,212,255,0.12)]"
                            onClick={() => openEdit(row)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Delete"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--pink)] transition-colors hover:bg-[rgba(244,63,94,0.12)] disabled:opacity-40 disabled:pointer-events-none"
                            onClick={() => handleDelete(row)}
                            disabled={deleteMut.isPending}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr
                    className="border-t font-medium"
                    style={{
                      borderColor: 'var(--border)',
                      background:
                        'linear-gradient(135deg, rgba(0,212,255,0.10), rgba(0,168,204,0.06))',
                    }}
                  >
                    <td
                      className="p-3 uppercase text-[10px] tracking-wider text-[var(--cyan)]"
                      colSpan={showSpocColumn ? 4 : 3}
                    >
                      Day total{isFiltered ? ' (all rows)' : ''}
                    </td>
                    <td className="p-3 text-right tabular-nums">{totals.applicationCount}</td>
                    <td className="p-3 text-right tabular-nums">{totals.callsReceived}</td>
                    <td className="p-3 text-right tabular-nums">{totals.interviewsScheduled}</td>
                    <td className="p-3" colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <JobApplicationFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSave}
        loading={createMut.isPending || updateMut.isPending}
        initial={editing}
        spocUserId={effectiveSpocId}
        defaultDate={date}
        portalSuggestions={portalSuggestions}
        title={editing ? 'Edit application entry' : 'Add application entry'}
      />

      <Modal
        open={Boolean(overwrite)}
        onClose={() => setOverwrite(null)}
        title="Entry already exists"
        size="sm"
        variant="dark"
      >
        <p className="text-sm text-[var(--text2)]">
          This SPOC already has a row for that student and portal on {date}. Overwrite the existing
          numbers, or cancel and edit the row from the table.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOverwrite(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="text-[#06080f] font-medium"
            style={GRADIENT_BTN}
            loading={updateMut.isPending}
            onClick={() => overwrite && persist(overwrite.body, overwrite.existingId)}
          >
            Overwrite
          </Button>
        </div>
      </Modal>
    </div>
  );
}
