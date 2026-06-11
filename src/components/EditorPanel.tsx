import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useStore } from '../store';

export function EditorPanel() {
  const code = useStore((s) => s.code);
  const setCode = useStore((s) => s.setCode);
  const phase = useStore((s) => s.phase);
  const steps = useStore((s) => s.steps);
  const currentStep = useStore((s) => s.currentStep);
  const traceLines = useStore((s) => s.traceLines);
  const error = useStore((s) => s.error);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  const readOnly = phase === 'playback' || phase === 'running';

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    decorationsRef.current = ed.createDecorationsCollection();
    monaco.editor.defineTheme('dsa-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#161B22',
        'editorGutter.background': '#161B22',
        'editorLineNumber.foreground': '#484F58',
        'editorLineNumber.activeForeground': '#8B949E',
      },
    });
    monaco.editor.setTheme('dsa-dark');
  };

  // Recompute decorations whenever the active step / trace / error changes.
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    const collection = decorationsRef.current;
    if (!ed || !monaco || !collection) return;

    const decorations: editor.IModelDeltaDecoration[] = [];

    // Gutter dots for every line that produced a trace event.
    for (const line of traceLines) {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'dsa-trace-gutter',
        },
      });
    }

    // Active step highlight.
    if (phase === 'playback' && steps[currentStep]) {
      const line = steps[currentStep].line;
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'dsa-active-line',
          glyphMarginClassName: 'dsa-active-line-glyph',
        },
      });
      ed.revealLineInCenterIfOutsideViewport(line);
    }

    // Error line highlight (red).
    if (error?.line) {
      decorations.push({
        range: new monaco.Range(error.line, 1, error.line, 1),
        options: {
          isWholeLine: true,
          className: 'dsa-error-line',
          glyphMarginClassName: 'dsa-error-line-glyph',
        },
      });
      ed.revealLineInCenterIfOutsideViewport(error.line);
    }

    collection.set(decorations);
  }, [phase, steps, currentStep, traceLines, error]);

  return (
    <div className="h-full w-full overflow-hidden bg-panel">
      <Editor
        height="100%"
        defaultLanguage="python"
        value={code}
        onChange={(v) => setCode(v ?? '')}
        onMount={onMount}
        options={{
          readOnly,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 13,
          lineNumbers: 'on',
          glyphMargin: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          tabSize: 4,
          automaticLayout: true,
          padding: { top: 8 },
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
