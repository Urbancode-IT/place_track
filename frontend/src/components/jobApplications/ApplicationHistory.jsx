import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { DatePickerField, DateRangePopover } from '@/components/ui/DatePickerField';
import { useExclusivePicker } from '@/components/ui/FixedPopover';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { InterviewSlotsSummary } from './InterviewSlotsSummary';
import {
  JOB_APPLICATION_COURSE_OPTIONS,
  JOB_APPLICATION_PORTALS,
  COURSE_COLORS,
} from '@/utils/constants';
import {
  clampHistoryDates,
  formatDateOnlyLabel,
  historyPresetRange,
  isDateOnly,
  isUuid,
  uniqueCanonicalPortals,
} from '@/utils/jobApplication';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useJobApplicationHistory,
  useJobApplicationPortals,
  useJobApplicationSpocs,
  useJobApplicationStudents,
} from '@/hooks/useJobApplications';
import { useAuthStore } from '@/store/auth.store';
import { useModulePath } from '@/lib/modulePath';

const DATE_PRESETS = [
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'CUSTOM', label: 'Custom' },
];

function inferPreset(dateFrom, dateTo) {
  for (const id of ['YESTERDAY', 'THIS_WEEK', 'THIS_MONTH']) {
    const range = historyPresetRange(id);
    if (!range.closed && range.dateFrom === dateFrom && range.dateTo === dateTo) return id;
  }
  return 'CUSTOM';
}

function readHistoryParams(searchParams) {
  const dateFromRaw = searchParams.get('dateFrom');
  const dateToRaw = searchParams.get('dateTo');
  const hasDates = isDateOnly(dateFromRaw) && isDateOnly(dateToRaw);
  const presetParam = searchParams.get('preset');
  const preset = DATE_PRESETS.some((p) => p.id === presetParam)
    ? presetParam
    : hasDates
      ? inferPreset(dateFromRaw, dateToRaw)
      : 'THIS_WEEK';
  const range =
    preset === 'CUSTOM'
      ? clampHistoryDates(dateFromRaw, dateToRaw)
      : historyPresetRange(preset);
  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  return {
    preset,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    closed: Boolean(range.closed),
    spocUserId: isUuid(searchParams.get('spocUserId')) ? searchParams.get('spocUserId') : '',
    studentId: isUuid(searchParams.get('studentId')) ? searchParams.get('studentId') : '',
    course: searchParams.get('course') || '',
    portal: searchParams.get('portal') || '',
    search: searchParams.get('q') || '',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

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

export function ApplicationHistory() {
  const user = useAuthStore((s) => s.user);
  const isTrainer = user?.role === 'TRAINER';
  const to = useModulePath();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initial] = useState(() => readHistoryParams(searchParams));

  const [preset, setPreset] = useState(initial.preset);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [closed, setClosed] = useState(initial.closed);
  const [spocUserId, setSpocUserId] = useState(initial.spocUserId);
  const [studentId, setStudentId] = useState(initial.studentId);
  const [course, setCourse] = useState(initial.course);
  const [portal, setPortal] = useState(initial.portal);
  const [search, setSearch] = useState(initial.search);
  const [page, setPage] = useState(initial.page);
  const debouncedSearch = useDebouncedValue(search, 400);
  const skipPageReset = useRef(true);
  const customAnchorRef = useRef(null);
  const [customOpen, setCustomOpen, requestCustomOpen] = useExclusivePicker();

  const { data: portalsRes } = useJobApplicationPortals();
  const portals = useMemo(
    () => uniqueCanonicalPortals([...JOB_APPLICATION_PORTALS, ...(portalsRes?.data || [])]),
    [portalsRes?.data]
  );

  const { data: spocsRes } = useJobApplicationSpocs({ withEntries: true });
  const spocs = spocsRes?.data || [];

  const { data: studentsRes, isFetched: studentsFetched } = useJobApplicationStudents({
    spocUserId: !isTrainer ? spocUserId || undefined : undefined,
    dateFrom: !closed && dateFrom ? dateFrom : undefined,
    dateTo: !closed && dateTo ? dateTo : undefined,
    enabled: !closed,
  });
  const students = studentsRes?.data || [];

  useEffect(() => {
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setPage(1);
  }, [preset, dateFrom, dateTo, spocUserId, studentId, course, portal, debouncedSearch]);

  useEffect(() => {
    if (!studentId || !studentsFetched) return;
    if (!students.some((s) => s.id === studentId)) setStudentId('');
  }, [students, studentId, studentsFetched]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        if (preset) next.set('preset', preset);
        if (!closed && dateFrom) next.set('dateFrom', dateFrom);
        if (!closed && dateTo) next.set('dateTo', dateTo);
        if (!isTrainer && spocUserId) next.set('spocUserId', spocUserId);
        if (studentId) next.set('studentId', studentId);
        if (course) next.set('course', course);
        if (portal) next.set('portal', portal);
        if (search.trim()) next.set('q', search.trim());
        if (page > 1) next.set('page', String(page));
        if (next.toString() === prev.toString()) return prev;
        return next;
      },
      { replace: true }
    );
  }, [
    preset,
    dateFrom,
    dateTo,
    spocUserId,
    studentId,
    course,
    portal,
    search,
    page,
    closed,
    isTrainer,
    setSearchParams,
  ]);

  const applyPreset = (id) => {
    if (id === 'CUSTOM') {
      setPreset('CUSTOM');
      requestCustomOpen();
      return;
    }
    setCustomOpen(false);
    setPreset(id);
    const range = historyPresetRange(id);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setClosed(Boolean(range.closed));
  };

  const applyCustomRange = (nextFrom, nextTo) => {
    const range = clampHistoryDates(nextFrom, nextTo);
    setPreset('CUSTOM');
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setClosed(Boolean(range.closed));
    return range;
  };

  const onFromChange = (next) => {
    const to = dateTo && next && next > dateTo ? next : dateTo;
    applyCustomRange(next, to);
  };

  const onToChange = (next) => {
    const from = dateFrom && next && next < dateFrom ? next : dateFrom;
    applyCustomRange(from, next);
  };

  const listParams = useMemo(() => {
    const params = {
      page,
      limit: 20,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(studentId ? { studentId } : {}),
      ...(course ? { course } : {}),
      ...(portal ? { portal } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    };
    if (!isTrainer && spocUserId) params.spocUserId = spocUserId;
    return params;
  }, [
    page,
    dateFrom,
    dateTo,
    studentId,
    course,
    portal,
    debouncedSearch,
    spocUserId,
    isTrainer,
  ]);

  const { data, isLoading, isError, error, isFetching, refetch } =
    useJobApplicationHistory(listParams, { enabled: !closed });

  const rows = data?.data || [];
  const pagination = data?.pagination || {};
  const totals = data?.totals || {
    applicationCount: 0,
    callsReceived: 0,
    interviewsScheduled: 0,
  };
  const totalPages = pagination.totalPages || 1;
  const showInitialLoader = isLoading && !rows.length;
  const hasActiveFilters = Boolean(
    dateFrom || dateTo || spocUserId || studentId || course || portal || debouncedSearch.trim()
  );

  const jumpToEdit = (row) => {
    const params = new URLSearchParams();
    if (row.date) params.set('date', row.date);
    if (row.spocUserId) params.set('spocUserId', row.spocUserId);
    params.set('edit', row.id);
    navigate(to(`/job-applications?${params.toString()}`));
  };

  const jumpToDay = (row) => {
    const params = new URLSearchParams();
    if (row.date) params.set('date', row.date);
    if (row.spocUserId) params.set('spocUserId', row.spocUserId);
    navigate(to(`/job-applications?${params.toString()}`));
  };

  const spocOptions = useMemo(
    () => [
      { value: '', label: 'All SPOCs' },
      ...spocs.map((s) => ({ value: s.id, label: s.name })),
    ],
    [spocs]
  );

  const studentOptions = useMemo(
    () => [
      { value: '', label: 'All students' },
      ...students.map((s) => ({ value: s.id, label: s.name })),
    ],
    [students]
  );

  const courseOptions = useMemo(
    () => [
      { value: '', label: 'All courses' },
      ...JOB_APPLICATION_COURSE_OPTIONS.map((c) => ({
        value: c.value,
        label: c.label,
      })),
    ],
    []
  );

  const portalOptions = useMemo(
    () => [
      { value: '', label: 'All portals' },
      ...portals.map((p) => ({ value: p, label: p })),
    ],
    [portals]
  );

  return (
    <div className="space-y-4">
      <div className="job-apps-tab-row">
        {DATE_PRESETS.map((opt) => {
          const isActive = preset === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              ref={opt.id === 'CUSTOM' ? customAnchorRef : undefined}
              onClick={() => applyPreset(opt.id)}
              aria-expanded={opt.id === 'CUSTOM' ? customOpen : undefined}
              aria-haspopup={opt.id === 'CUSTOM' ? 'dialog' : undefined}
              className="job-apps-tab transition-colors"
              style={
                isActive
                  ? {
                      background:
                        'linear-gradient(135deg, rgba(0,212,255,0.22), rgba(0,168,204,0.16))',
                      border: '1px solid rgba(0, 212, 255, 0.5)',
                      color: 'var(--cyan)',
                      boxShadow: '0 0 14px rgba(0, 212, 255, 0.16)',
                    }
                  : {
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                    }
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <DateRangePopover
        open={customOpen}
        anchorRef={customAnchorRef}
        onClose={() => setCustomOpen(false)}
        from={dateFrom}
        to={dateTo}
        onPickRange={({ dateFrom: nextFrom, dateTo: nextTo, done }) => {
          applyCustomRange(nextFrom, nextTo);
          if (done) setCustomOpen(false);
        }}
      />

      <div className="job-apps-filter-row">
        <div>
          <DatePickerField
            label="From"
            variant="field"
            value={dateFrom}
            onChange={onFromChange}
            placeholder="From date"
          />
        </div>
        <div>
          <DatePickerField
            label="To"
            variant="field"
            value={dateTo}
            onChange={onToChange}
            placeholder="To date"
          />
        </div>
        {!isTrainer && (
          <div>
            <SearchableSelect
              label="SPOC"
              value={spocUserId}
              onChange={(e) => setSpocUserId(e.target.value)}
              options={spocOptions}
              searchable
              searchPlaceholder="Search SPOC…"
              placeholder="All SPOCs"
              maxMenuHeight={140}
            />
          </div>
        )}
        <div>
          <SearchableSelect
            label="Student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            options={studentOptions}
            searchable
            searchPlaceholder="Search student…"
            placeholder="All students"
            maxMenuHeight={140}
          />
        </div>
        <div>
          <SearchableSelect
            label="Course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            options={courseOptions}
            searchable
            searchPlaceholder="Search course…"
            placeholder="All courses"
            maxMenuHeight={140}
          />
        </div>
        <div>
          <SearchableSelect
            label="Portal"
            value={portal}
            onChange={(e) => setPortal(e.target.value)}
            options={portalOptions}
            searchable
            searchPlaceholder="Search portal…"
            placeholder="All portals"
            maxMenuHeight={140}
          />
        </div>
        <div>
          <Input
            label="Search"
            type="search"
            className="text-sm"
            placeholder="Student, portal, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            {error?.response?.data?.message || 'Could not load history.'}
          </p>
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div
            className="rounded-xl border px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.10), rgba(0,168,204,0.06))',
              borderColor: 'rgba(0, 212, 255, 0.28)',
            }}
          >
            <span className="text-[10px] uppercase tracking-wider text-[var(--cyan)] font-medium">
              Range totals
            </span>
            <span className="text-[var(--text2)]">
              Applications{' '}
              <span className="tabular-nums text-[var(--text)] font-medium">
                {totals.applicationCount}
              </span>
            </span>
            <span className="text-[var(--text2)]">
              Calls{' '}
              <span className="tabular-nums text-[var(--text)] font-medium">
                {totals.callsReceived}
              </span>
            </span>
            <span className="text-[var(--text2)]">
              Interviews{' '}
              <span className="tabular-nums text-[var(--text)] font-medium">
                {totals.interviewsScheduled}
              </span>
            </span>
            <span className="text-[11px] text-[var(--text3)] ml-auto">
              {pagination.total || 0} row{(pagination.total || 0) === 1 ? '' : 's'}
            </span>
          </div>

          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr
                    className="text-left text-[var(--text3)] text-[10px] uppercase tracking-wider border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <th className="p-3">Date</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Portal</th>
                    <th className="p-3 text-right">Applications</th>
                    <th className="p-3 text-right">Calls</th>
                    <th className="p-3 text-right">Interviews</th>
                    <th className="p-3">SPOC</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--text3)] text-sm">
                        {closed
                          ? 'This date range can’t be shown.'
                          : hasActiveFilters
                            ? 'No matches for these filters.'
                            : 'No application history yet.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-[rgba(255,255,255,0.03)]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="p-3 whitespace-nowrap">
                          <button
                            type="button"
                            className="text-[var(--cyan)] hover:underline"
                            onClick={() => jumpToDay(row)}
                            title="Open this day in Daily Entry"
                          >
                            {row.date ? formatDateOnlyLabel(row.date, 'd MMM') : '—'}
                          </button>
                        </td>
                        <td className="p-3">
                          <Link
                            to={to(`/students/${row.studentId}`)}
                            className="text-[var(--cyan)] hover:underline font-medium"
                          >
                            {row.student?.name || '—'}
                          </Link>
                          {row.interviewsScheduled > 0 ? (
                            <div className="mt-1">
                              <InterviewSlotsSummary row={row} compact />
                            </div>
                          ) : null}
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
                        <td className="p-3">{row.portal}</td>
                        <td className="p-3 text-right tabular-nums">{row.applicationCount}</td>
                        <td className="p-3 text-right tabular-nums">{row.callsReceived}</td>
                        <td className="p-3 text-right tabular-nums">{row.interviewsScheduled}</td>
                        <td className="p-3 text-[var(--text2)]">{row.spoc?.name || '—'}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            title="Edit in Daily Entry"
                            aria-label="Edit in Daily Entry"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--cyan)] transition-colors hover:bg-[rgba(0,212,255,0.12)]"
                            onClick={() => jumpToEdit(row)}
                          >
                            <EditIcon />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
