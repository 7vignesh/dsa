import { useStore } from '../store';

export function LoadingBar() {
  const status = useStore((s) => s.runtimeStatus);
  const detail = useStore((s) => s.runtimeDetail);

  const isLoading = status === 'loading' || status === 'idle';

  return (
    <div className="h-7 border-b border-border bg-panel flex items-center px-3 gap-3 text-xs">
      <span className="font-sans font-semibold tracking-wide text-primary">
        DSA Code Visualizer
      </span>
      <div className="flex-1 relative h-[3px] bg-[#21262d] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-y-0 left-0 w-1/3 bg-cyan animate-[loading_1.2s_ease-in-out_infinite]" />
        )}
        {status === 'ready' && <div className="absolute inset-0 bg-success/40" />}
      </div>
      <span className={status === 'ready' ? 'text-success' : 'text-muted'}>
        {status === 'ready' ? 'Ready' : detail || 'Loading Python runtime…'}
      </span>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
