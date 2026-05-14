import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { COURSE_COLORS } from '@/utils/constants';

const COURSES = Object.keys(COURSE_COLORS);

export function StudentFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <Input
        type="search"
        name="q"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search name, email..."
        value={filters.search || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-48 min-w-[12rem]"
      />
      <Select
        placeholder="Course"
        value={filters.course || ''}
        onChange={(e) => onChange({ ...filters, course: e.target.value || undefined })}
        options={[{ value: '', label: 'All courses' }, ...COURSES.map((c) => ({ value: c, label: c }))]}
      />
      <Select
        placeholder="Status"
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        options={[
          { value: '', label: 'All status' },
          { value: 'SCHEDULED', label: 'Scheduled' },
          { value: 'SHORTLISTED', label: 'Shortlisted' },
          { value: 'SELECTED', label: 'Selected' },
          { value: 'REJECTED', label: 'Rejected' },
        ]}
      />
    </div>
  );
}
