import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { interviewApi } from '@/api/interview.api';
import { AddScheduleModal } from '@/components/interviews/AddScheduleModal';
import { KanbanCard } from '@/components/interviews/KanbanCard';
import { DraggableKanbanCard, interviewIdFromCardId } from '@/components/interviews/DraggableKanbanCard';
import { KanbanColumn } from '@/components/interviews/KanbanColumn';
import { ScheduleTable } from '@/components/interviews/ScheduleTable';
import { Button } from '@/components/ui/Button';
import { downloadScheduleCsv } from '@/api/export.api';
import { Spinner } from '@/components/ui/Spinner';
import { useCreateInterview, useUpdateInterview, useUpdateInterviewStatus } from '@/hooks/useInterviews';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';

const COLUMN_IDS = [
  'SCHEDULED',
  'AWAITING_RESPONSE',
  'SHORTLISTED',
  'REJECTED',
  'RESCHEDULED',
  'NO_RESPONSE',
];

const COLUMN_CONFIG = [
  { id: 'SCHEDULED', title: 'Scheduled', accent: '#00D4FF' },
  { id: 'AWAITING_RESPONSE', title: 'Awaiting Response', accent: '#FFD60A' },
  { id: 'SHORTLISTED', title: 'Shortlisted', accent: '#00FFA3' },
  { id: 'REJECTED', title: 'Rejected', accent: '#FF3D82' },
  { id: 'RESCHEDULED', title: 'Rescheduled', accent: '#9B5DFF' },
  { id: 'NO_RESPONSE', title: 'No Response', accent: '#7B82A8' },
];

const FILTER_OPTIONS = [
  { id: 'ALL', label: 'ALL' },
  { id: 'FSD', label: 'FSD' },
  { id: 'SDET', label: 'SDET' },
  { id: 'BI_DS', label: 'BI_DS' },
  { id: 'THIS_WEEK', label: 'This week' },
];

export default function Schedule() {
  const [limit] = useState(50);
  const [filters, setFilters] = useState({});
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('BOARD');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['interviews', { limit, ...filters }],
    queryFn: () => interviewApi.list({ page: 1, limit, ...filters }).then((r) => r.data),
  });
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();
  const updateStatus = useUpdateInterviewStatus();

  const rawInterviews = data?.data || [];

  const interviews = useMemo(() => {
    let list = rawInterviews;
    if (courseFilter !== 'ALL' && courseFilter !== 'THIS_WEEK') {
      list = list.filter(
        (i) => (i.student?.course || '').toUpperCase().replace(/\s/g, '_') === courseFilter
      );
    }
    if (courseFilter === 'THIS_WEEK') {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      list = list.filter((i) => {
        const d = i.date ? (typeof i.date === 'string' ? parseISO(i.date) : new Date(i.date)) : null;
        return d && isWithinInterval(d, { start: weekStart, end: weekEnd });
      });
    }
    return list;
  }, [rawInterviews, courseFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newStatus = COLUMN_IDS.includes(String(over.id)) ? String(over.id) : null;
    if (!newStatus) return;
    const interviewId = interviewIdFromCardId(active.id);
    if (interviewId == null) return;
    const interview = interviews.find((i) => i.id == interviewId);
    if (!interview || interview.status === newStatus) return;
    updateStatus.mutate({ id: interviewId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const getColumnItems = (status) =>
    interviews.filter((i) => getEffectiveInterviewStatus(i) === status);

  return (
    <div className="space-y-5 text-[var(--text)]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">
            02 ▸ KANBAN SCHEDULE BOARD
          </p>
       
          <h1 className="mt-1 font-syne text-[20px] font-semibold text-[var(--text)]">
            Interview Pipeline
          </h1>
          <p className="font-mono text-[11px] text-[var(--text2)] mt-0.5">
            {interviews.length} students · March 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="font-mono text-[10px]"
            onClick={() => downloadScheduleCsv(filters).catch(() => {})}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            className="font-syne text-[11px] font-extrabold px-4 py-1.5 rounded-lg"
            style={{
              background: 'var(--cyan)',
              color: '#000',
              boxShadow: '0 0 12px rgba(0,212,255,0.45)',
            }}
            onClick={() => setModalOpen(true)}
          >
            + Add Interview
          </Button>
        </div>
      </div>

      {/* Board shell */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Board header row: filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: 'var(--green)', boxShadow: '0 0 10px var(--green-dim)' }}
            />
            <span className="font-syne text-[13px] font-semibold text-[var(--text)]">
              Interview Pipeline
            </span>
            <span className="font-mono text-[10px] text-[var(--text3)]">
              {interviews.length} active
              {courseFilter !== 'ALL' && ` · ${courseFilter === 'THIS_WEEK' ? 'This week' : courseFilter}`}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {FILTER_OPTIONS.map((opt) => {
                const isActive = courseFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCourseFilter(opt.id)}
                    className="px-3 py-1.5 rounded-md font-medium transition-colors"
                    style={
                      isActive
                        ? {
                            background: 'rgba(14, 165, 233, 0.2)',
                            border: '1px solid rgba(14, 165, 233, 0.4)',
                            color: 'var(--cyan)',
                          }
                        : {
                            border: '1px solid var(--border)',
                            color: 'var(--text2)',
                          }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {['BOARD', 'TABLE'].map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className="px-3 py-1.5 rounded-md font-medium transition-colors"
                    style={
                      isActive
                        ? {
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.45)',
                            color: 'var(--green)',
                          }
                        : {
                            border: '1px solid var(--border)',
                            color: 'var(--text2)',
                          }
                    }
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {viewMode === 'BOARD' ? (
          <>
            {/* Columns with drag and drop */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {COLUMN_CONFIG.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    items={getColumnItems(col.id)}
                    renderCard={(i) => (
                      <DraggableKanbanCard
                        key={i.id}
                        interview={i}
                        columnAccent={col.accent}
                        onEdit={(interview) => {
                          setEditingInterview(interview);
                          setModalOpen(true);
                        }}
                      />
                    )}
                  />
                ))}
              </div>

              <DragOverlay>
                {({ active }) => {
                  const interview = active?.data?.current?.interview;
                  if (!interview) return null;
                  const col =
                    COLUMN_CONFIG.find((c) => c.id === getEffectiveInterviewStatus(interview)) ||
                    COLUMN_CONFIG[0];
                  return (
                    <div className="rotate-2 shadow-xl rounded-xl opacity-95">
                      <KanbanCard interview={interview} columnAccent={col.accent} />
                    </div>
                  );
                }}
              </DragOverlay>
            </DndContext>
          </>
        ) : (
          <ScheduleTable
            data={interviews}
            onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
            onEdit={(interview) => {
              setEditingInterview(interview);
              setModalOpen(true);
            }}
          />
        )}
      </div>

      <AddScheduleModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingInterview(null);
        }}
        initialData={editingInterview}
        mode={editingInterview ? 'edit' : 'create'}
        onSubmit={(payload) => {
          if (editingInterview?.id) {
            updateInterview.mutate({ id: editingInterview.id, data: payload });
          } else {
            createInterview.mutate(payload);
          }
        }}
      />
    </div>
  );
}
