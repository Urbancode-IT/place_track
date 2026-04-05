import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { studentApi } from '@/api/student.api';
import { useStudent } from '@/hooks/useStudents';

export function ResumeUpload({ studentId }) {
  const [uploading, setUploading] = useState(false);
  const { data, refetch } = useStudent(studentId);
  const student = data?.data;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    setUploading(true);
    try {
      await studentApi.uploadResume(studentId, file);
      refetch();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input type="file" accept=".pdf" onChange={handleFile} disabled={uploading} className="text-sm" />
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
