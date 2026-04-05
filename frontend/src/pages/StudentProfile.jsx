import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStudent } from '@/hooks/useStudents';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { ResumeUpload } from '@/components/profile/ResumeUpload';
import { SelfIntroEditor } from '@/components/profile/SelfIntroEditor';
import { QABank } from '@/components/profile/QABank';
import { SkillsChart } from '@/components/profile/SkillsChart';
import { InterviewTimeline } from '@/components/profile/InterviewTimeline';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { StudentSelfInterviewLink } from '@/components/profile/StudentSelfInterviewLink';
import { StudentHonestReviews } from '@/components/profile/StudentHonestReviews';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/utils/helpers';

export default function StudentProfile() {
  const { id } = useParams();
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, error, refetch } = useStudent(id);
  const [tab, setTab] = useState('Overview');

  const student = data?.data;
  const errMsg = error?.response?.data?.message || error?.message || 'Could not load this student.';

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="max-w-lg mx-auto rounded-2xl border p-8 space-y-4 text-center"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
      >
        <h1 className="font-syne text-lg font-semibold">Student profile</h1>
        <p className="text-sm text-[var(--text2)]">{errMsg}</p>
        <p className="text-xs text-[var(--text3)]">
          Trainers only see students who have at least one interview assigned to them. Admins see everyone.
        </p>
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
          <Link
            to="/students"
            className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-primary text-white hover:bg-primary/90"
          >
            Back to students
          </Link>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12 space-y-3 text-[var(--text2)]">
        <p>Student not found.</p>
        <Link to="/students" className="text-[var(--cyan)] text-sm hover:underline">
          ← Back to students
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileHero
        student={student}
        actions={
          <StudentSelfInterviewLink>
            {(role === 'TRAINER' || role === 'ADMIN') && (
              <Link
                to="/honest-review-link"
                className={cn(
                  'inline-flex items-center justify-center font-semibold rounded-lg px-4 py-2 text-sm transition-colors shrink-0',
                  'bg-primary text-white shadow-md shadow-primary/25 border border-primary/90',
                  'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[var(--bg)]'
                )}
              >
                Honest review link →
              </Link>
            )}
          </StudentSelfInterviewLink>
        }
      />
      <ProfileTabs active={tab} onChange={setTab} />
      <StudentHonestReviews studentId={id} />
      <div
        className="rounded-2xl border p-6 mt-2"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        {tab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-syne text-[13px] font-semibold text-[var(--text)] mb-3">
                Skill assessment
              </h3>
              <SkillsChart />
            </div>
            <div>
              <h3 className="font-syne text-[13px] font-semibold text-[var(--text)] mb-3">
                Interview timeline
              </h3>
              <InterviewTimeline interviews={student.interviews} />
            </div>
          </div>
        )}
        {tab === 'Resume' && <ResumeUpload studentId={id} />}
        {tab === 'Self Intro' && <SelfIntroEditor studentId={id} />}
        {tab === 'Q&A' && <QABank studentId={id} />}
        {tab === 'Schedule History' && <InterviewTimeline interviews={student.interviews} />}
        {tab === 'Notes' && (
          <p className="text-[var(--text3)] text-sm">Notes (trainer-only) – placeholder.</p>
        )}
      </div>
    </div>
  );
}
