import { useStore } from '../store';
import type { DetectedStructure } from '../types';
import { ArrayView } from './viz/ArrayView';
import { HashmapView } from './viz/HashmapView';
import { StackView } from './viz/StackView';
import { QueueView } from './viz/QueueView';
import { SetView } from './viz/SetView';
import { TreeView } from './viz/TreeView';

function StructureRenderer({ structure }: { structure: DetectedStructure }) {
  switch (structure.type) {
    case 'array':
      return <ArrayView structure={structure} />;
    case 'hashmap':
      return <HashmapView structure={structure} />;
    case 'stack':
      return <StackView structure={structure} />;
    case 'queue':
      return <QueueView structure={structure} />;
    case 'set':
      return <SetView structure={structure} />;
    case 'tree':
      return <TreeView structure={structure} />;
    default:
      return null;
  }
}

export function VizPanel() {
  const phase = useStore((s) => s.phase);
  const steps = useStore((s) => s.steps);
  const currentStep = useStore((s) => s.currentStep);

  const step = phase === 'playback' ? steps[currentStep] : undefined;
  const structures = step?.dataStructures ?? [];

  return (
    <div className="h-full w-full bg-bg overflow-auto">
      <div className="px-3 py-2 border-b border-border bg-panel text-muted text-xs font-sans">
        Data Structure Visualization
      </div>
      <div className="p-4 flex flex-col gap-6">
        {structures.length === 0 ? (
          <div className="text-muted text-sm font-sans mt-10 text-center max-w-md mx-auto leading-relaxed">
            {phase === 'playback' ? (
              <span className="italic">No structure to visualize for this step</span>
            ) : (
              <>
                <div className="italic mb-3">Write any Python code, then click Visualize.</div>
                <div className="text-xs text-left inline-block">
                  <div className="mb-1">Two ways to use it:</div>
                  <div>
                    • Define a function — the <span className="text-cyan">Input</span> fields
                    (e.g. <span className="font-mono">nums = [1,2,3], target = 4</span>) map to
                    its arguments and it runs automatically.
                  </div>
                  <div>
                    • Or write a full script that runs top-to-bottom. Input variables are
                    available to your code; leave Input empty if not needed.
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          structures.map((s) => <StructureRenderer key={s.name} structure={s} />)
        )}
      </div>
    </div>
  );
}
