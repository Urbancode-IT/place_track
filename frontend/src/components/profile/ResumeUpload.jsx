import { useState } from 'react';
import { studentApi } from '@/api/student.api';
import { useStudent } from '@/hooks/useStudents';
import { useNotificationStore } from '@/store/notification.store';

export function ResumeUpload({ studentId }) {
  const [uploading, setUploading] = useState(false);
  const { data, refetch } = useStudent(studentId);
  const student = data?.data;
  const addToast = useNotificationStore((s) => s.addToast);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    setUploading(true);
    try {
      await studentApi.uploadResume(studentId, file);
      refetch();
      addToast({ type: 'success', message: 'Resume uploaded' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err?.response?.data?.message || 'Resume upload failed',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input type="file" accept=".pdf" onChange={handleFile} disabled={uploading} className="text-sm" />
      {uploading && <p className="text-xs text-[var(--text3)]">Uploading…</p>}
      {student?.resumeUrl && (
        <div className="mt-2">
          <a href={student.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            View / Download Resume
          </a>
        </div>
      )}
    </div>
  );
}
