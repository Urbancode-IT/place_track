import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { studentApi } from '@/api/student.api';
import { useStudent } from '@/hooks/useStudents';
import { toast } from '@/components/ui/Toast';

export function SelfIntroEditor({ studentId }) {
  const { data, refetch } = useStudent(studentId);
  const [saving, setSaving] = useState(false);
  const student = data?.data;
  const [text, setText] = useState('');
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    if (student?.selfIntro != null && !edit) setText(student.selfIntro || '');
  }, [student?.selfIntro, edit]);

  const save = async (intro) => {
    if (!studentId) return;
    setSaving(true);
    try {
      await studentApi.updateSelfIntro(studentId, intro);
      toast.success('Self introduction updated');
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update self introduction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setEdit(true)}
        rows={6}
        className="w-full rounded-lg px-3 py-2 text-sm border border-[var(--border)] bg-[rgba(0,0,0,0.25)] text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:ring-2 focus:ring-primary"
        placeholder="Self introduction script..."
      />
      <Button size="sm" disabled={saving} onClick={() => save(text)}>Save</Button>
    </div>
  );
}
