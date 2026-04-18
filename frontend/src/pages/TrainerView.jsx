import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { trainerApi } from '@/api/trainer.api';
import { interviewApi } from '@/api/interview.api';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { AddTrainerModal } from '@/components/trainers/AddTrainerModal';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useUpdateInterview, useUpdateInterviewStatus } from '@/hooks/useInterviews';
import { useNotifyTrainer, useCreateTrainer } from '@/hooks/useTrainers';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/helpers';
import { useNotificationStore } from '@/store/notification.store';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';

const AVATAR_COLORS = [
  'var(--tc-primary)',   // blue
  'var(--tc-yellow)',     // yellow
  'var(--tc-green)',      // green
  'var(--violet)',        // purple
  'var(--orange)',        // orange
];

function getInitials(name) {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

function TrainerAvatar({ name, index = 0, size = 'md' }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white shrink-0', sizeClass)}
      style={{ backgroundColor: bg }}
    >
      {getInitials(name)}
    </div>
  );
}

export default function TrainerView() {
  const [selectedTrainerId, setSelectedTrainerId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [notifyChannels, setNotifyChannels] = useState({ email: true, sms: false, whatsapp: true, push: true });
  const [profileOpen, setProfileOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState('');
  const [activeInterviewForNotes, setActiveInterviewForNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');
  const [statusDrafts, setStatusDrafts] = useState({});
  const addToast = useNotificationStore((s) => s.addToast);

  const { data: trainersData } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainerApi.list().then((r) => r.data),
  });
  const { data: interviewsData } = useQuery({
    queryKey: ['trainer-interviews', selectedTrainerId],
    queryFn: () => trainerApi.getInterviews(selectedTrainerId).then((r) => r.data),
    enabled: !!selectedTrainerId,
  });
  const { data: allInterviewsData } = useQuery({
    queryKey: ['interviews', { page: 1, limit: 200 }],
    queryFn: () => interviewApi.list({ page: 1, limit: 200 }).then((r) => r.data),
    enabled: assignOpen,
  });

  const updateStatus = useUpdateInterviewStatus();
  const updateInterview = useUpdateInterview();
  const notifyTrainer = useNotifyTrainer();
  const createTrainer = useCreateTrainer();

  const trainers = Array.isArray(trainersData?.data) ? trainersData.data : [];
  const interviews = Array.isArray(interviewsData?.data) ? interviewsData.data : [];
  const allInterviews = Array.isArray(allInterviewsData?.data) ? allInterviewsData.data : [];

  const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);
  useEffect(() => {
    if (!selectedTrainerId && trainers.length) {
      setSelectedTrainerId(trainers[0].id);
    }
  }, [selectedTrainerId, trainers]);
  const selectedTrainerInterviews = useMemo(() => {
    if (!selectedTrainerId) return [];
    return allInterviews.filter((i) =>
      Array.isArray(i.trainers) && i.trainers.some((t) => t?.trainer?.id === selectedTrainerId)
    );
  }, [allInterviews, selectedTrainerId]);
  const unassignedForSelectedTrainer = useMemo(
    () => allInterviews.filter((i) => !selectedTrainerInterviews.some((ti) => ti.id === i.id)),
    [allInterviews, selectedTrainerInterviews]
  );
  const stats = {
    interviews: interviews.length,
    shortlisted: interviews.filter((i) => getEffectiveInterviewStatus(i) === 'SHORTLISTED').length,
    futures: interviews.filter((i) => {
      if (['AWAITING_RESPONSE', 'RESCHEDULED'].includes(i.status)) return true;
      return getEffectiveInterviewStatus(i) === 'SCHEDULED';
    }).length,
    declined: interviews.filter((i) => i.status === 'REJECTED').length,
  };

  const handleAddTrainer = (data) => {
    createTrainer.mutate(data, { onSuccess: () => setAddModalOpen(false) });
  };

  const handleSendNotificationNow = () => {
    if (!selectedTrainerId || !interviews.length) return;
    notifyTrainer.mutate({ trainerId: selectedTrainerId, interviewId: interviews[0].id });
  };
  const handleAssignInterview = () => {
    if (!selectedTrainerId || !selectedInterviewId) return;
    interviewApi
      .addTrainers(selectedInterviewId, [selectedTrainerId])
      .then(() => {
        addToast({ type: 'success', message: 'Interview assigned to trainer' });
        setAssignOpen(false);
        setSelectedInterviewId('');
      })
      .catch(() => addToast({ type: 'error', message: 'Failed to assign interview' }));
  };
  const handleSaveStatus = (interviewId) => {
    const status = statusDrafts[interviewId];
    if (!status) return;
    updateStatus.mutate(
      { id: interviewId, status },
      {
        onSuccess: () => addToast({ type: 'success', message: 'Status updated' }),
        onError: () => addToast({ type: 'error', message: 'Failed to update status' }),
      }
    );
  };
  const openNotesModal = (interview) => {
    setActiveInterviewForNotes(interview);
    setNotesValue(interview.comments || '');
    setNotesOpen(true);
  };
  const handleSaveNotes = () => {
    if (!activeInterviewForNotes?.id) return;
    updateInterview.mutate(
      { id: activeInterviewForNotes.id, data: { comments: notesValue } },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Notes updated' });
          setNotesOpen(false);
        },
        onError: () => addToast({ type: 'error', message: 'Failed to update notes' }),
      }
    );
  };

  return (
    <div className="space-y-4 text-[var(--text)]">
      {/* Breadcrumb */}
      <div>
        <p className="font-mono text-[10px] tracking-widest uppercase text-[var(--text3)]">
          H / TRAINER CENTER + NOTIFICATIONS
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text2)]">
          Items / Trainer Center / Add & Edit / {trainers.length}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        {/* Left: Trainers list + Notify section */}
        <div
          className="rounded-xl p-4 space-y-4 h-fit"
          style={{ background: 'var(--tc-panel)', border: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="font-syne text-base font-semibold text-white">Trainers</h2>
            <p className="text-[11px] text-[var(--text2)] mt-0.5">Tag - Auto Notify via Email & SMS</p>
          </div>

          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {trainers.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTrainerId(t.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                  selectedTrainerId === t.id
                    ? 'bg-[var(--tc-primary-dim)]'
                    : 'hover:bg-[var(--tc-panel-hover)]'
                )}
              >
                <TrainerAvatar name={t.name} index={idx} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13px] text-white truncate">{t.name}</span>
                    {selectedTrainerId === t.id && (
                      <span
                        className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--tc-primary-dim)', color: 'var(--tc-primary)' }}
                      >
                        active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text2)] truncate">{t.email}</p>
                  {selectedTrainerId === t.id && (
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">
                      {interviews.length} Interview{interviews.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <Button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="w-full rounded-lg font-medium text-[12px] py-2.5"
            style={{ background: 'var(--tc-panel-hover)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            + Add Trainer
          </Button>

          {selectedTrainer && (
            <>
              <div className="pt-2 border-t border-[var(--border)]">
                <h3 className="font-syne text-[13px] font-semibold text-white mb-3">
                  Notify {selectedTrainer.name}
                </h3>
                <div className="flex flex-wrap gap-4">
                  {['email', 'sms', 'whatsapp', 'push'].map((ch) => (
                    <div key={ch} className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--text2)] capitalize">{ch}</span>
                      <Toggle
                        checked={notifyChannels[ch]}
                        onChange={(v) => setNotifyChannels((s) => ({ ...s, [ch]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  className="w-full mt-4 rounded-lg font-medium text-[13px] py-2.5"
                  style={{ background: 'var(--tc-primary)', color: '#fff' }}
                  onClick={handleSendNotificationNow}
                  disabled={!interviews.length || notifyTrainer.isPending}
                >
                  Send Notification Now
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right: Trainer details + metrics + assigned interviews */}
        {selectedTrainer ? (
          <div className="space-y-5">
            {/* Trainer header */}
            <div
              className="rounded-xl p-4 flex flex-wrap items-center gap-4"
              style={{ background: 'var(--tc-panel)', border: '1px solid var(--border)' }}
            >
              <TrainerAvatar name={selectedTrainer.name} index={trainers.findIndex((t) => t.id === selectedTrainerId)} />
              <div className="flex-1 min-w-0">
                <h2 className="font-syne text-lg font-semibold text-white">{selectedTrainer.name}</h2>
                <p className="text-[12px] text-[var(--text2)]">{selectedTrainer.email}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg border border-[var(--border)] text-[var(--text)] bg-transparent hover:bg-[var(--tc-panel-hover)]"
                  onClick={() => setProfileOpen(true)}
                >
                  View Profile
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg font-medium text-[12px]"
                  style={{ background: 'var(--tc-primary)', color: '#fff' }}
                  onClick={() => setAssignOpen(true)}
                >
                  + Assign Interview
                </Button>
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Interviews', value: stats.interviews, color: 'var(--tc-primary)' },
                { label: 'Shortlisted', value: stats.shortlisted, color: 'var(--tc-green)' },
                { label: 'Futures', value: stats.futures, color: 'var(--tc-yellow)' },
                { label: 'Declined', value: stats.declined, color: 'var(--tc-red)' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--tc-panel)', border: '1px solid var(--border)' }}
                >
                  <p className="text-[11px] text-[var(--text2)] uppercase tracking-wide">{m.label}</p>
                  <p className="text-2xl font-semibold mt-1" style={{ color: m.color }}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Assigned Interviews */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--tc-panel)', border: '1px solid var(--border)' }}
            >
              <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]">
                <h3 className="font-syne text-[14px] font-semibold text-white">Assigned Interviews</h3>
                <span className="text-[11px] text-[var(--text2)]">Showing {interviews.length} records</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {interviews.map((i) => {
                  const pipeline = getEffectiveInterviewStatus(i);
                  const avatarKey =
                    pipeline === 'REJECTED' ? 'REJECTED' : pipeline === 'SHORTLISTED' ? 'SHORTLISTED' : 'SCHEDULED';
                  return (
                  <div
                    key={i.id}
                    className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-[var(--tc-panel-hover)]"
                  >
                    <TrainerAvatar
                      name={i.student?.name}
                      index={['SHORTLISTED', 'REJECTED', 'SCHEDULED'].indexOf(avatarKey) % AVATAR_COLORS.length}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px] text-white">{i.student?.name}</p>
                      <p className="text-[11px] text-[var(--text2)]">
                        {i.company} - {i.round} - {formatDate(i.date, 'EEE')} - {i.timeSlot}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-2 py-1 rounded shrink-0',
                        pipeline === 'SHORTLISTED' && 'bg-[var(--tc-green-dim)] text-[var(--tc-green)]',
                        pipeline === 'REJECTED' && 'bg-[var(--tc-red-dim)] text-[var(--tc-red)]',
                        !['SHORTLISTED', 'REJECTED'].includes(pipeline) && 'bg-[var(--tc-panel-hover)] text-[var(--text2)]'
                      )}
                    >
                      {pipeline === 'SHORTLISTED'
                        ? 'Shortlisted'
                        : pipeline === 'REJECTED'
                          ? 'Rejected'
                          : pipeline}
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={statusDrafts[i.id] || i.status}
                        onChange={(e) => setStatusDrafts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                        className="text-[10px] rounded px-2 py-1 bg-[var(--tc-bg)] border border-[var(--border)] text-[var(--text)]"
                      >
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="SHORTLISTED">Shortlisted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="AWAITING_RESPONSE">Awaiting</option>
                        <option value="RESCHEDULED">Rescheduled</option>
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-[10px] rounded border border-[var(--border)] bg-transparent text-[var(--text2)]"
                        onClick={() => handleSaveStatus(i.id)}
                      >
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-[10px] rounded border border-[var(--border)] bg-transparent text-[var(--text2)]"
                        onClick={() => openNotesModal(i)}
                      >
                        Notes
                      </Button>
                    </div>
                  </div>
                );
                })}
                {interviews.length === 0 && (
                  <div className="px-4 py-8 text-center text-[12px] text-[var(--text3)]">
                    No assigned interviews
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: 'var(--tc-panel)', border: '1px solid var(--border)' }}
          >
            <p className="text-[var(--text2)]">Select a trainer from the list</p>
          </div>
        )}
      </div>

      <AddTrainerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddTrainer}
        isLoading={createTrainer.isPending}
      />

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Trainer Profile" variant="dark">
        {selectedTrainer ? (
          <div className="space-y-3 text-sm">
            <p><span className="text-[var(--text3)]">Name:</span> {selectedTrainer.name}</p>
            <p><span className="text-[var(--text3)]">Email:</span> {selectedTrainer.email}</p>
            <p><span className="text-[var(--text3)]">Phone:</span> {selectedTrainer.phone || '-'}</p>
            <p><span className="text-[var(--text3)]">Assigned Interviews:</span> {interviews.length}</p>
          </div>
        ) : null}
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Interview" variant="dark">
        <div className="space-y-4">
          <Select
            label="Select Interview"
            value={selectedInterviewId}
            onChange={(e) => setSelectedInterviewId(e.target.value)}
            options={[
              { value: '', label: 'Choose interview' },
              ...unassignedForSelectedTrainer.map((i) => ({
                value: i.id,
                label: `${i.student?.name || 'Student'} - ${i.company} (${i.round})`,
              })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignInterview} disabled={!selectedInterviewId}>Assign</Button>
          </div>
        </div>
      </Modal>

      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Interview Notes" variant="dark">
        <div className="space-y-4">
          {(activeInterviewForNotes?.trainerReviewRating ||
            (activeInterviewForNotes?.trainerReviewNotes || '').trim()) && (
            <div
              className="rounded-lg border px-3 py-2.5 text-sm space-y-1"
              style={{ borderColor: 'var(--border)', background: 'rgba(155,93,255,0.08)' }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wide text-[var(--text3)]">
                Student trainer review (from interview finish)
              </p>
              {activeInterviewForNotes.trainerReviewRating && (
                <p className="text-[var(--text)] font-medium">
                  {activeInterviewForNotes.trainerReviewRating === 'EXCELLENT'
                    ? 'Excellent'
                    : activeInterviewForNotes.trainerReviewRating === 'GOOD'
                      ? 'Good'
                      : activeInterviewForNotes.trainerReviewRating === 'BAD'
                        ? 'Bad'
                        : activeInterviewForNotes.trainerReviewRating}
                </p>
              )}
              {(activeInterviewForNotes.trainerReviewNotes || '').trim() ? (
                <p className="text-[var(--text2)] text-[13px] whitespace-pre-wrap">
                  {activeInterviewForNotes.trainerReviewNotes}
                </p>
              ) : null}
            </div>
          )}
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            rows={5}
            placeholder="Add notes for this interview"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--tc-bg)] text-[var(--text)] px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNotesOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes} disabled={updateInterview.isPending}>Save Notes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
