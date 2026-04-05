import { useDroppable } from '@dnd-kit/core';
import { DraggableKanbanCard } from './DraggableKanbanCard';

export function KanbanColumn({ column, items, renderCard }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      className="min-w-[240px] w-64 flex-shrink-0 rounded-2xl p-3 space-y-3"
      style={{
        background: 'var(--panel)',
        border: `1px solid ${isOver ? 'var(--cyan)' : 'var(--border)'}`,
        boxShadow: isOver ? '0 0 0 2px rgba(0,212,255,0.25)' : undefined,
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: column.accent,
              boxShadow: `0 0 10px ${column.accent}88`,
            }}
          />
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--text)] truncate">
            {column.title}
          </p>
        </div>
        <span
          className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded shrink-0"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}
        >
          {String(items.length).padStart(2, '0')}
        </span>
      </div>

      {/* Droppable card list */}
      <div
        ref={setNodeRef}
        className="space-y-2 min-h-[120px] rounded-xl transition-colors"
        style={{
          background: isOver ? 'rgba(0,212,255,0.04)' : 'transparent',
        }}
      >
        {items.map((i) =>
          renderCard ? renderCard(i) : <DraggableKanbanCard key={i.id} interview={i} columnAccent={column.accent} />
        )}
        {items.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-4 text-[10px] text-[var(--text3)] text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            {isOver ? 'Drop here' : 'No interviews in this lane'}
          </div>
        )}
      </div>
    </div>
  );
}
