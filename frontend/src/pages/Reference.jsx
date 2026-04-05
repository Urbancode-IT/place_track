/**
 * Reference page — Design system (color tokens, status tags).
 * Linked from sidebar tab "Reference".
 */
const COLOR_TOKENS = [
  { name: 'Cyan - Primary', var: '--cyan', value: '#00D4FF' },
  { name: 'Green - Success', var: '--green', value: '#00FFA3' },
  { name: 'Pink - Danger', var: '--pink', value: '#FF3D82' },
  { name: 'Yellow - Warning', var: '--yellow', value: '#FFD60A' },
  { name: 'Violet - Accent', var: '--violet', value: '#9B5DFF' },
  { name: 'Orange - Trainer', var: '--orange', value: '#FF6B35' },
  { name: 'Canvas', var: '--bg', value: '#06080F' },
  { name: 'Panel / Sidebar', var: '--bg2', value: '#0A0D18' },
  { name: 'Card / Surface', var: '--panel', value: 'rgba(255,255,255,0.03)' },
];

const STATUS_TAGS = [
  { label: 'Shortlisted', color: '#00FFA3', desc: 'L3 Cleared' },
  { label: 'Selected', color: '#00D4FF', desc: 'Offer accepted' },
  { label: 'Rejected', color: '#FF3D82', desc: 'Did not clear' },
  { label: 'Awaiting Response', color: '#FFD60A', desc: 'HR pending' },
  { label: 'Rescheduled', color: '#9B5DFF', desc: 'New date set' },
  { label: 'No Response', color: '#7B82A8', desc: 'Company absent' },
];

export default function Reference() {
  return (
    <div className="space-y-6 text-[var(--text)]">
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">
          Reference
        </p>
        <h1 className="mt-1 font-syne text-[20px] font-semibold">Reference</h1>
      </div>

      {/* Design system */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <h2 className="font-syne text-[14px] font-semibold text-[var(--text)] mb-4">
          Design system
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--text2)]">
              Design tokens — color system
            </h3>
            <div className="flex flex-wrap gap-2">
              {COLOR_TOKENS.map((t) => (
                <div
                  key={t.var}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    className="w-5 h-5 rounded shrink-0"
                    style={{
                      background: t.value === 'rgba(255,255,255,0.03)' ? 'var(--panel)' : t.value,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <span className="font-mono text-[9px] text-[var(--text2)]">{t.name}</span>
                  <span className="font-mono text-[8px] text-[var(--text3)]">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--text2)]">
              Status tag system
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_TAGS.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono"
                  style={{
                    background: `${s.color}22`,
                    border: `1px solid ${s.color}66`,
                    color: s.color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
