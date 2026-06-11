import type { DetectedStructure } from '../../types';
import { formatCell } from '../../lib/format';

export function ArrayView({ structure }: { structure: DetectedStructure }) {
  const arr = Array.isArray(structure.value) ? structure.value : [];
  const active = new Set(structure.activeIndices ?? []);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted text-xs font-mono mb-1">{structure.name}</div>
      <div className="flex flex-wrap gap-1">
        {arr.map((item, i) => {
          const isActive = active.has(i);
          return (
            <div key={i} className="flex flex-col items-center">
              <div className="h-4 flex items-end justify-center">
                {isActive && <span className="text-cyan text-xs leading-none">▼</span>}
              </div>
              <div
                className={`min-w-[44px] h-11 px-2 flex items-center justify-center font-mono text-sm border transition-colors duration-150 ${
                  isActive
                    ? 'border-cyan text-cyan bg-cyan/10'
                    : 'border-border text-primary bg-inspector'
                }`}
              >
                {formatCell(item)}
              </div>
              <div className="text-muted text-[10px] font-mono mt-0.5">{i}</div>
            </div>
          );
        })}
        {arr.length === 0 && <div className="text-muted text-xs font-mono italic">empty</div>}
      </div>
    </div>
  );
}
