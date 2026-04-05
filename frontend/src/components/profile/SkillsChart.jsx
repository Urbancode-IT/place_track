const SKILLS = ['Technical', 'Communication', 'Problem Solving', 'Domain Knowledge'];

export function SkillsChart({ scores }) {
  const map = scores || {};
  return (
    <div className="space-y-3">
      {SKILLS.map((label) => {
        const pct = map[label] ?? 0;
        return (
          <div key={label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{label}</span>
              <span className="text-gray-500">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
