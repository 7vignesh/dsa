import type { DetectedStructure } from '../../types';
import { formatCell } from '../../lib/format';

export function StackView({ structure }: { structure: DetectedStructure }) {
  const arr = Array.isArray(structure.value) ? structure.value : [];
  const topIndex = arr.length - 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted text-xs font-mono mb-1">{structure.name} (stack)</div>
      <div className="flex flex-col-reverse gap-1 w-32">
        {arr.map((item, i) => {
          const isTop = i === topIndex;
          return (
            <div
              key={i}
              className={`relative h-10 flex items-center justify-center font-mono text-sm border transition-colors duration-150 ${
                isTop ? 'border-cyan text-cyan bg-cyan/10' : 'border-border text-primary bg-inspector'
              }`}
            >
              {formatCell(item)}
              {isTop && (
                <span className="absolute -right-10 text-cyan text-[10px] font-mono">← top</span>
              )}
            </div>
          );
        })}
        {arr.length === 0 && (
          <div className="text-muted text-xs font-mono italic">empty</div>
        )}
      </div>
    </div>
  );
}
