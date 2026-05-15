import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS, STATUS_COLORS } from '@/utils/constants';
import {
  formatInterviewRoundAndSchedule,
  getEffectiveInterviewStatus,
  getEffectivePipelineLabel,
} from '@/utils/interviewEffectiveStatus';

function StudentTableInner({ data }) {
  const columns = [
    { field: 'name', header: 'Name', render: (val, row) => <Link to={`/students/${row.id}`} className="text-primary hover:underline font-medium">{val}</Link> },
    { field: 'email', header: 'Email' },
    { field: 'course', header: 'Course', render: (val) => <Badge className={COURSE_COLORS[val]}>{val}</Badge> },
    { field: 'batchId', header: 'Batch' },
    {
      field: 'interviews',
      header: 'Interview',
      render: (_, row) => {
        const i = row.interviews?.[0];
        if (!i) return <span className="text-[var(--text3)] text-sm">—</span>;
        const eff = getEffectiveInterviewStatus(i);
        const label = getEffectivePipelineLabel(i);
        const detail = formatInterviewRoundAndSchedule(i);
        const company = String(i.company || '').trim();
        return (
          <div className="space-y-1 py-0.5">
            <Badge className={`${STATUS_COLORS[eff]?.bg} ${STATUS_COLORS[eff]?.text}`}>{label}</Badge>
            {company ? (
              <p className="text-xs font-medium text-[var(--text)] max-w-[240px] truncate" title={company}>
                {company}
              </p>
            ) : null}
            <p className="text-[11px] text-[var(--text2)] max-w-[260px] leading-snug" title={detail}>
              {detail}
            </p>
          </div>
        );
      },
    },
  ];
  return <Table columns={columns} data={data} keyField="id" />;
}

export const StudentTable = memo(StudentTableInner);
