import { useStore } from '../store';
import { formatValue, isReprFallback } from '../lib/format';

export function VariableInspector() {
  const phase = useStore((s) => s.phase);
  const steps = useStore((s) => s.steps);
  const currentStep = useStore((s) => s.currentStep);
  const returnValue = useStore((s) => s.returnValue);

  const step = phase === 'playback' ? steps[currentStep] : undefined;
  const prev = phase === 'playback' && currentStep > 0 ? steps[currentStep - 1] : undefined;

  // Layer 5: hide variables that start with '_'.
  const vars = step
    ? Object.entries(step.variables).filter(([name]) => !name.startsWith('_'))
    : [];

  const atEnd =
    step &&
    currentStep === steps.length - 1 &&
    step.event === 'return' &&
    step.function !== '<module>';

  return (
    <div className="h-full w-full bg-inspector overflow-auto flex flex-col">
      <div className="px-3 py-2 border-b border-border bg-panel text-muted text-xs font-sans">
        Variable Inspector
      </div>

      <div className="p-3 flex-1">
        {!step ? (
          <div className="text-muted text-sm font-sans italic">No variables yet</div>
        ) : (
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-muted text-left">
                <th className="font-normal pb-1 pr-2">name</th>
                <th className="font-normal pb-1">value</th>
              </tr>
            </thead>
            <tbody>
              {vars.map(([name, value]) => {
                const changed =
                  !prev ||
                  JSON.stringify(prev.variables[name]) !== JSON.stringify(value);
                const fallback = isReprFallback(value);
                return (
                  <tr
                    key={name}
                    className={`align-top ${changed ? 'animate-amberFlash' : ''}`}
                  >
                    <td className="text-cyan pr-3 py-0.5 whitespace-nowrap">{name}</td>
                    <td className="text-primary py-0.5 break-all">
                      {fallback && <span title="Non-serializable value">⚠ </span>}
                      {formatValue(value)}
                    </td>
                  </tr>
                );
              })}
              {vars.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-muted italic py-1">
                    no locals in scope
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {atEnd && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="text-success text-xs font-mono">
              return → {formatValue(returnValue)}
            </div>
          </div>
        )}
      </div>

      {/* Call stack */}
      <div className="border-t border-border">
        <div className="px-3 py-2 text-muted text-xs font-sans">Call Stack</div>
        <div className="px-3 pb-3 flex flex-col gap-0.5">
          {step && step.callStack.length > 0 ? (
            step.callStack
              .slice()
              .reverse()
              .map((fn, i) => {
                const label = fn === '<module>' ? '(top level)' : `${fn}()`;
                return (
                  <div
                    key={`${fn}-${i}`}
                    className={`text-xs font-mono ${i === 0 ? 'text-primary' : 'text-muted'}`}
                  >
                    {i === 0 ? '▸ ' : '  '}
                    {label}
                  </div>
                );
              })
          ) : (
            <div className="text-muted text-xs font-mono italic">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
