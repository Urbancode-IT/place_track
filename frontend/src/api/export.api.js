import { api } from './axios.instance';

export async function downloadScheduleCsv(params = {}) {
  const { data } = await api.get('/export/schedule/csv', { params, responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schedule.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadStudentsCsv(params = {}) {
  const { data } = await api.get('/export/students/csv', { params, responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students.csv';
  a.click();
  URL.revokeObjectURL(url);
}
