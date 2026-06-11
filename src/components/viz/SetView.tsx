import type { DetectedStructure } from '../../types';
import { formatCell } from '../../lib/format';

export function SetView({ structure }: { structure: DetectedStructure }) {
  const tag = structure.value as { __set__?: unknown[] } | undefined;
  const items = Array.isArray(tag?.__set__) ? tag!.__set__ : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted text-xs font-mono mb-1">{structure.name} (set)</div>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="min-w-[40px] h-9 px-2 flex items-center justify-center font-mono text-sm border border-border rounded-full text-primary bg-inspector"
          >
            {formatCell(item)}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-muted text-xs font-mono italic">empty</div>
        )}
      </div>
    </div>
  );
}
