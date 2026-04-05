import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { studentApi } from '@/api/student.api';
import { useStudent } from '@/hooks/useStudents';

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
      refetch();
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
        className="w-full border border-border rounded-lg px-3 py-2 text-sm"
        placeholder="Self introduction script..."
      />
      <Button size="sm" disabled={saving} onClick={() => save(text)}>Save</Button>
    </div>
  );
}
