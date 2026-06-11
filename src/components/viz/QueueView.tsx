import type { DetectedStructure } from '../../types';
import { formatCell } from '../../lib/format';

export function QueueView({ structure }: { structure: DetectedStructure }) {
  const arr = Array.isArray(structure.value) ? structure.value : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted text-xs font-mono mb-1">{structure.name} (queue)</div>
      <div className="flex items-center gap-1">
        <span className="text-cyan text-[10px] font-mono">front →</span>
        {arr.map((item, i) => (
          <div
            key={i}
            className="min-w-[44px] h-11 px-2 flex items-center justify-center font-mono text-sm border border-border text-primary bg-inspector transition-colors duration-150"
          >
            {formatCell(item)}
          </div>
        ))}
        {arr.length === 0 && (
          <div className="text-muted text-xs font-mono italic">empty</div>
        )}
        <span className="text-cyan text-[10px] font-mono">→ back</span>
      </div>
    </div>
  );
}
