import { useStore } from '../store';

export function ErrorBanner() {
  const error = useStore((s) => s.error);
  if (!error) return null;

  return (
    <div className="border-b border-danger/50 bg-danger/10 px-3 py-2 flex items-start gap-2">
      <span className="text-danger text-sm font-mono mt-px">✕</span>
      <span className="text-danger text-xs font-mono leading-relaxed flex-1">
        {error.message}
        {error.line ? ` (line ${error.line})` : ''}
      </span>
    </div>
  );
}
