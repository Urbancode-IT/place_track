import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { studentApi } from '@/api/student.api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { listQueryOptions } from '@/lib/queryDefaults';
import { StudentCard } from '@/components/students/StudentCard';
import { StudentTable } from '@/components/students/StudentTable';
import { StudentFilters } from '@/components/students/StudentFilters';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { useCreateStudent } from '@/hooks/useStudents';
import { downloadStudentsCsv } from '@/api/export.api';
import { toast } from '@/components/ui/Toast';

export default function Students() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [view, setView] = useState('card');
  const [filters, setFilters] = useState(() => (urlSearch ? { search: urlSearch } : {}));
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search ?? '', 400);

  useEffect(() => {
    setPage(1);
    setFilters((prev) => {
      const current = prev.search || '';
      if (current === urlSearch) return prev;
      return { ...prev, search: urlSearch };
    });
  }, [urlSearch]);

  const handleFiltersChange = (next) => {
    setPage(1);
    setFilters(next);
  };

  const listParams = useMemo(() => {
    const q = typeof debouncedSearch === 'string' ? debouncedSearch.trim() : '';
    return {
      page,
      limit: 12,
      ...(filters.course ? { course: filters.course } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(q ? { search: q } : {}),
    };
  }, [debouncedSearch, filters.course, filters.status, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['students', listParams],
    queryFn: () => studentApi.list(listParams).then((r) => r.data),
    ...listQueryOptions,
  });
  const createStudent = useCreateStudent();

  const students = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const handleAddStudent = (formData) => {
    createStudent.mutate(formData, {
      onSuccess: () => {
        setModalOpen(false);
        toast.success('Student added successfully!');
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to add student');
      },
    });
  };

  const showInitialLoader = isLoading && !students.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-medium">Students</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              downloadStudentsCsv(listParams)
                .then(() => toast.success('Students CSV downloaded'))
                .catch((err) => toast.error(err?.response?.data?.message || 'Failed to download CSV'));
            }}
          >
            Export CSV
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Add Student</Button>
        </div>
      </div>
      <StudentFilters filters={filters} onChange={handleFiltersChange} />
      {isFetching && !showInitialLoader ? (
        <p className="text-xs text-[var(--text3)] ">Updating…</p>
      ) : null}
      <div className="flex gap-2">
        <Button
          variant={view === 'card' ? 'primary' : 'secondary'}
          size="sm"
          className={view === 'table' ? 'bg-[var(--surface-muted)] text-[var(--text)] border border-[var(--shell-border)] hover:bg-[var(--surface-hover)]' : 'text-white'}
          onClick={() => setView('card')}
        >
          Cards
        </Button>
        <Button
          variant={view === 'table' ? 'primary' : 'secondary'}
          size="sm"
          className={view === 'card' ? 'bg-[var(--surface-muted)] text-[var(--text)] border border-[var(--shell-border)] hover:bg-[var(--surface-hover)]' : 'text-white'}
          onClick={() => setView('table')}
        >
          Table
        </Button>
      </div>
      {showInitialLoader ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : view === 'card' ? (
        <div className="grid gap-2.5 justify-start [grid-template-columns:repeat(auto-fill,minmax(200px,220px))]">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      ) : (
        <StudentTable data={students} />
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
      <AddStudentModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddStudent} />
    </div>
  );
}
