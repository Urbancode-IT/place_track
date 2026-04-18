import { Link } from 'react-router-dom';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS, STATUS_COLORS } from '@/utils/constants';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';

export function StudentTable({ data }) {
  const columns = [
    { field: 'name', header: 'Name', render: (val, row) => <Link to={`/students/${row.id}`} className="text-primary hover:underline font-medium">{val}</Link> },
    { field: 'email', header: 'Email' },
    { field: 'course', header: 'Course', render: (val) => <Badge className={COURSE_COLORS[val]}>{val}</Badge> },
    { field: 'batchId', header: 'Batch' },
    {
      field: 'interviews',
      header: 'Status',
      render: (_, row) => {
        const i = row.interviews?.[0];
        if (!i) return '-';
        const eff = getEffectiveInterviewStatus(i);
        return <Badge className={STATUS_COLORS[eff]?.bg + ' ' + STATUS_COLORS[eff]?.text}>{eff}</Badge>;
      },
    },
  ];
  return <Table columns={columns} data={data} keyField="id" />;
}
