import type { DetectedStructure } from '../../types';
import { formatCell } from '../../lib/format';

export function HashmapView({ structure }: { structure: DetectedStructure }) {
  const obj =
    structure.value && typeof structure.value === 'object' && !Array.isArray(structure.value)
      ? (structure.value as Record<string, unknown>)
      : {};
  const entries = Object.entries(obj);
  const active = new Set(structure.activeKeys ?? []);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted text-xs font-mono mb-1">{structure.name}</div>
      <div className="flex flex-wrap gap-1">
        {entries.map(([k, v]) => {
          const isActive = active.has(k);
          return (
            <div
              key={k}
              className={`flex items-stretch border font-mono text-sm transition-colors duration-150 ${
                isActive ? 'border-cyan bg-cyan/10' : 'border-border bg-inspector'
              }`}
            >
              <span className={`px-2 py-1.5 ${isActive ? 'text-cyan' : 'text-primary'}`}>
                {formatCell(k)}
              </span>
              <span className="px-1 py-1.5 text-muted">→</span>
              <span className={`px-2 py-1.5 ${isActive ? 'text-cyan' : 'text-primary'}`}>
                {formatCell(v)}
              </span>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="text-muted text-xs font-mono italic">empty</div>
        )}
      </div>
    </div>
  );
}
