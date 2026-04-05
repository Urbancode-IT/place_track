import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/student.api';
import { StudentCard } from '@/components/students/StudentCard';
import { StudentTable } from '@/components/students/StudentTable';
import { StudentFilters } from '@/components/students/StudentFilters';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { useCreateStudent } from '@/hooks/useStudents';
import { downloadStudentsCsv } from '@/api/export.api';

export default function Students() {
  const [view, setView] = useState('card');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['students', { ...filters, page, limit: 12 }],
    queryFn: () => studentApi.list({ ...filters, page, limit: 12 }).then((r) => r.data),
  });
  const createStudent = useCreateStudent();

  const students = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const handleAddStudent = (formData) => {
    createStudent.mutate(formData, { onSuccess: () => setModalOpen(false) });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadStudentsCsv(filters).catch(() => {})}>Export CSV</Button>
          <Button onClick={() => setModalOpen(true)}>+ Add Student</Button>
        </div>
      </div>
      <StudentFilters filters={filters} onChange={setFilters} />
      <div className="flex gap-2">
        <Button variant={view === 'card' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('card')}>Cards</Button>
        <Button variant={view === 'table' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('table')}>Table</Button>
      </div>
      {view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
