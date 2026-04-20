import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard } from './KanbanCard';

const CARD_ID_PREFIX = 'card-';

export function cardId(interviewId) {
  return `${CARD_ID_PREFIX}${interviewId}`;
}

export function interviewIdFromCardId(cardIdStr) {
  if (typeof cardIdStr !== 'string' || !cardIdStr.startsWith(CARD_ID_PREFIX)) return null;
  const num = cardIdStr.slice(CARD_ID_PREFIX.length);
  return Number.isNaN(Number(num)) ? num : Number(num);
}

export function DraggableKanbanCard({ interview, columnAccent, onEdit, onDelete }) {
  const id = cardId(interview.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { interview },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
    >
      <KanbanCard
        interview={interview}
        columnAccent={columnAccent}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
