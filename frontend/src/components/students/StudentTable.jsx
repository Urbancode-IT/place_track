import { Link } from 'react-router-dom';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS, STATUS_COLORS } from '@/utils/constants';

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
        return <Badge className={STATUS_COLORS[i.status]?.bg + ' ' + STATUS_COLORS[i.status]?.text}>{i.status}</Badge>;
      },
    },
  ];
  return <Table columns={columns} data={data} keyField="id" />;
}
