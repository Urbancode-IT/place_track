const AVATAR_COLORS = [
  'linear-gradient(135deg,#0ea5e9,#0369a1)',
  'linear-gradient(135deg,#eab308,#ca8a04)',
  'linear-gradient(135deg,#22c55e,#15803d)',
  'linear-gradient(135deg,#a855f7,#7e22ce)',
  'linear-gradient(135deg,#f43f5e,#be123c)',
];

function getInitials(name) {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '—';
}

export function TrainerWorkload({ data }) {
  const list = data?.map((t) => ({
    name: t.trainerName || 'Trainer',
    count: t.assignedCount ?? 0,
  })) || [];

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <h3 className="font-syne text-[12px] font-semibold text-[var(--text)] mb-3">
        Trainer Workload
      </h3>
      {list.length > 0 ? (
        <ul className="space-y-2">
          {list.map((t, i) => (
            <li
              key={t.name + i}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-syne font-bold text-[10px] text-white"
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {getInitials(t.name)}
                </span>
                <span className="font-outfit text-[var(--text)] truncate">{t.name}</span>
              </div>
              <span
                className="flex-shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0,212,255,0.12)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  color: 'var(--cyan)',
                }}
              >
                {t.count}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[var(--text3)] text-[11px]">No data</p>
      )}
    </div>
  );
}
