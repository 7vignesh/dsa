import { useStore, MAX_INPUT_LENGTH } from '../store';
import { EXAMPLES } from '../examples';

export function Toolbar() {
  const input = useStore((s) => s.input);
  const setInput = useStore((s) => s.setInput);
  const loadExample = useStore((s) => s.loadExample);
  const visualize = useStore((s) => s.visualize);
  const reset = useStore((s) => s.reset);
  const phase = useStore((s) => s.phase);
  const runtimeStatus = useStore((s) => s.runtimeStatus);

  const ready = runtimeStatus === 'ready';
  const running = phase === 'running';
  const inPlayback = phase === 'playback';

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-panel">
      <select
        className="bg-inspector border border-border text-primary text-xs font-sans px-2 py-1.5 outline-none focus:border-cyan"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) loadExample(e.target.value);
          e.target.value = '';
        }}
      >
        <option value="" disabled>
          Load Example…
        </option>
        {EXAMPLES.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 flex-1 min-w-0">
        <label className="text-muted text-xs font-sans whitespace-nowrap">
          Input <span className="opacity-60">(optional)</span>
        </label>
        <input
          className="flex-1 min-w-0 bg-inspector border border-border text-primary font-mono text-xs px-2 py-1.5 outline-none focus:border-cyan disabled:opacity-50"
          value={input}
          maxLength={MAX_INPUT_LENGTH + 50}
          disabled={inPlayback || running}
          spellCheck={false}
          placeholder="nums = [1,2,3], target = 4   (or leave empty)"
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      {inPlayback ? (
        <button
          className="bg-inspector border border-border text-primary text-xs font-sans px-3 py-1.5 hover:border-cyan"
          onClick={reset}
        >
          Reset
        </button>
      ) : (
        <button
          className="bg-cyan text-[#06222a] text-xs font-sans font-semibold px-4 py-1.5 hover:bg-[#22d3ee] disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!ready || running}
          onClick={() => void visualize()}
        >
          {running ? 'Running…' : 'Visualize'}
        </button>
      )}
    </div>
  );
}
