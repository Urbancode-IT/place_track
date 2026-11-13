import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { qaApi } from '@/api/qa.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { listQueryOptions } from '@/lib/queryDefaults';
import { useModulePath } from '@/lib/modulePath';
import { COURSE_SELECT_OPTIONS, QA_STATUS } from '@/utils/constants';
import { INTERVIEW_QA_TOPICS_DEFAULT } from '@/constants/interviewQaTopics';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/utils/helpers';

const STATUS_OPTIONS = ['PENDING', 'PREPARED', 'NEEDS_WORK'];

/** Topic filter options = defaults + common course topics (deduped) */
const TOPIC_FILTER_OPTIONS = [
  ...new Set([
    ...INTERVIEW_QA_TOPICS_DEFAULT,
    'Frontend',
    'Backend',
    'Database',
    'React',
    'Core Java',
    'Selenium / UI Automation',
    'API Testing',
    'SQL / Database',
    'AWS Core',
  ]),
];

export default function Questions() {
  const to = useModulePath();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(course ? { course } : {}),
      ...(topic ? { topic } : {}),
      ...(status ? { status } : {}),
    }),
    [page, debouncedSearch, course, topic, status]
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['qa-admin', params],
    queryFn: () => qaApi.list(params).then((r) => r.data),
    ...listQueryOptions,
  });

  const rows = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const updateMut = useMutation({
    mutationFn: ({ id, data: body }) => qaApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-admin'] });
      toast.success('Question updated');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => qaApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-admin'] });
      toast.success('Question deleted');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Delete failed'),
  });

  const resetFilters = () => {
    setSearch('');
    setCourse('');
    setTopic('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-4 text-[var(--text)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] tracking-[0.18em] uppercase text-[var(--violet)]">Module</p>
          <h1 className="text-[22px] font-medium">Questions</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            All student interview Q&amp;A. Filter by course, topic (Frontend / Backend / Database…), status, or
            search.
          </p>
        </div>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </div>

      <div
        className="rounded-2xl border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <div className="lg:col-span-2">
          <Input
            label="Search"
            placeholder="Student, question, company…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text2)] mb-1">Course</label>
          <select
            value={course}
            onChange={(e) => {
              setPage(1);
              setCourse(e.target.value);
            }}
            className={cn('w-full px-3 py-2 rounded-lg glass-input text-[var(--text)] text-sm')}
          >
            <option value="">All courses</option>
            {COURSE_SELECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text2)] mb-1">Topic</label>
          <select
            value={topic}
            onChange={(e) => {
              setPage(1);
              setTopic(e.target.value);
            }}
            className={cn('w-full px-3 py-2 rounded-lg glass-input text-[var(--text)] text-sm')}
          >
            <option value="">All topics</option>
            {TOPIC_FILTER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text2)] mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className={cn('w-full px-3 py-2 rounded-lg glass-input text-[var(--text)] text-sm')}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text3)] py-8">No questions match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border p-4 space-y-3"
              style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link className="text-[var(--cyan)] hover:underline font-medium" to={to(`/students/${r.studentId}`)}>
                    {r.studentName}
                  </Link>
                  <p className="text-[11px] text-[var(--text3)] mt-0.5">
                    {[r.course, r.category, r.studentEmail].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={QA_STATUS[r.status]?.bg}>{r.status}</Badge>
                  <select
                    value={r.status}
                    onChange={(e) => updateMut.mutate({ id: r.id, data: { status: e.target.value } })}
                    className="text-xs rounded px-2 py-1 border border-[var(--border)] bg-[rgba(0,0,0,0.25)] text-[var(--text)]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[var(--text3)]">
                    {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy h:mm a') : ''}
                  </span>
                </div>
              </div>

              <div
                className="rounded-xl p-3 space-y-3"
                style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.22)' }}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--cyan)] mb-1">Question</p>
                  <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{r.question}</p>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'rgba(0,212,255,0.2)' }}>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--violet)] mb-1">Answer</p>
                  <p className="text-sm text-[var(--text2)] whitespace-pre-wrap">{r.answer || '—'}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="danger"
                  loading={deleteMut.isPending}
                  onClick={() => {
                    if (window.confirm('Delete this Q&A entry?')) deleteMut.mutate(r.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
