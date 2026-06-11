import { useEffect } from 'react';
import { useStore } from './store';
import { LoadingBar } from './components/LoadingBar';
import { Toolbar } from './components/Toolbar';
import { ErrorBanner } from './components/ErrorBanner';
import { EditorPanel } from './components/EditorPanel';
import { VizPanel } from './components/VizPanel';
import { VariableInspector } from './components/VariableInspector';
import { PlaybackControls } from './components/PlaybackControls';

export default function App() {
  const initRuntime = useStore((s) => s.initRuntime);
  const phase = useStore((s) => s.phase);
  const stepForward = useStore((s) => s.stepForward);
  const stepBack = useStore((s) => s.stepBack);
  const togglePlay = useStore((s) => s.togglePlay);

  // Load Pyodide in the background on startup.
  useEffect(() => {
    initRuntime();
  }, [initRuntime]);

  // Keyboard shortcuts during playback.
  useEffect(() => {
    if (phase !== 'playback') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBack();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, stepForward, stepBack, togglePlay]);

  return (
    <div className="h-full w-full flex flex-col">
      <LoadingBar />
      <Toolbar />
      <ErrorBanner />

      <div className="flex-1 flex min-h-0">
        <div className="w-[38%] min-w-[260px] border-r border-border">
          <EditorPanel />
        </div>
        <div className="flex-1 min-w-0 border-r border-border">
          <VizPanel />
        </div>
        <div className="w-[26%] min-w-[240px]">
          <VariableInspector />
        </div>
      </div>

      <PlaybackControls />
    </div>
  );
}
