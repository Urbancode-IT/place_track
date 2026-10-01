import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/helpers';

const PICKER_EVENT = 'pt:picker-open';

/** Close sibling pickers when another one opens. */
export function useExclusivePicker() {
  const idRef = useRef(`p-${Math.random().toString(36).slice(2)}`);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = (e) => {
      if (e.detail !== idRef.current) setOpen(false);
    };
    window.addEventListener(PICKER_EVENT, onOpen);
    return () => window.removeEventListener(PICKER_EVENT, onOpen);
  }, []);

  const requestOpen = () => {
    window.dispatchEvent(new CustomEvent(PICKER_EVENT, { detail: idRef.current }));
    setOpen(true);
  };

  return [open, setOpen, requestOpen];
}

/**
 * Fixed overlay popover that sits above modals without leaking clicks
 * through to the modal backdrop. Width is clamped to the viewport.
 */
export function FixedPopover({
  open,
  anchorRef,
  onClose,
  width = 300,
  minWidth = 260,
  maxWidth = 340,
  estimatedHeight = 340,
  className,
  children,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pos, setPos] = useState({ top: 8, left: 8, width });

  useLayoutEffect(() => {
    if (!open) return undefined;

    const place = () => {
      const anchor = anchorRef?.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const gap = 8;
      const availW = Math.max(200, window.innerWidth - 16);
      const panelW = Math.min(
        maxWidth,
        availW,
        Math.max(minWidth, typeof width === 'number' ? width : r.width)
      );
      const panelH = panelRef.current?.offsetHeight || estimatedHeight;
      let top = r.bottom + gap;
      if (top + panelH > window.innerHeight - 8) {
        top = Math.max(8, r.top - panelH - gap);
      }
      let left = r.left;
      if (left + panelW > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - panelW - 8);
      }
      if (left < 8) left = 8;
      setPos({ top, left, width: panelW });
    };

    place();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(place);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, anchorRef, width, minWidth, maxWidth, estimatedHeight]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 100190 }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
        }}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        className={cn('fixed rounded-2xl overflow-hidden', className)}
        style={{
          zIndex: 100200,
          top: pos.top,
          left: pos.left,
          width: pos.width,
          background: 'linear-gradient(180deg, #1c2233 0%, #141824 100%)',
          border: '1px solid rgba(0, 212, 255, 0.22)',
          boxShadow:
            '0 18px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.06), 0 0 28px rgba(0,212,255,0.08)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
