import { useStore, SPEEDS } from '../store';

function Btn({
  label,
  onClick,
  disabled,
  wide,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      className={`h-8 ${wide ? 'w-12' : 'w-9'} flex items-center justify-center border border-border bg-inspector text-primary text-sm hover:border-cyan disabled:opacity-30 disabled:cursor-not-allowed`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export function PlaybackControls() {
  const phase = useStore((s) => s.phase);
  const steps = useStore((s) => s.steps);
  const currentStep = useStore((s) => s.currentStep);
  const isPlaying = useStore((s) => s.isPlaying);
  const speed = useStore((s) => s.speed);

  const jumpStart = useStore((s) => s.jumpStart);
  const stepBack = useStore((s) => s.stepBack);
  const togglePlay = useStore((s) => s.togglePlay);
  const stepForward = useStore((s) => s.stepForward);
  const jumpEnd = useStore((s) => s.jumpEnd);
  const goToStep = useStore((s) => s.goToStep);
  const setSpeed = useStore((s) => s.setSpeed);

  const active = phase === 'playback' && steps.length > 0;
  const total = steps.length;
  const atStart = currentStep === 0;
  const atEnd = currentStep >= total - 1;

  return (
    <div className="h-12 border-t border-border bg-panel flex items-center gap-3 px-3">
      <div className="flex items-center gap-1">
        <Btn label="|◀" onClick={jumpStart} disabled={!active || atStart} />
        <Btn label="◀" onClick={stepBack} disabled={!active || atStart} />
        <Btn
          label={isPlaying ? '❚❚' : '▶'}
          onClick={togglePlay}
          disabled={!active}
          wide
        />
        <Btn label="▶" onClick={stepForward} disabled={!active || atEnd} />
        <Btn label="▶|" onClick={jumpEnd} disabled={!active || atEnd} />
      </div>

      <div className="flex items-center gap-1 text-xs font-sans">
        <span className="text-muted">Speed</span>
        <select
          className="bg-inspector border border-border text-primary px-1.5 py-1 outline-none focus:border-cyan disabled:opacity-40"
          value={speed}
          disabled={!active}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={currentStep}
        disabled={!active}
        onChange={(e) => goToStep(Number(e.target.value))}
        className="flex-1 accent-cyan h-1 disabled:opacity-40"
      />

      <div className="text-xs font-mono text-muted whitespace-nowrap min-w-[90px] text-right">
        {active ? `Step ${currentStep + 1} / ${total}` : 'Step 0 / 0'}
      </div>
    </div>
  );
}
