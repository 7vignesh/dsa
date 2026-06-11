/// <reference lib="webworker" />
import { HARNESS_SOURCE } from './harness';
import type { WorkerInbound, WorkerOutbound, RunResult } from '../types';

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Minimal shape of the Pyodide API we rely on.
interface PyodideApi {
  runPython: (code: string) => unknown;
  globals: {
    set: (name: string, value: unknown) => void;
    get: (name: string) => unknown;
  };
}

let pyodide: PyodideApi | null = null;
let loadPromise: Promise<void> | null = null;

const post = (msg: WorkerOutbound) => self.postMessage(msg);

async function ensurePyodide(): Promise<void> {
  if (pyodide) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    post({ type: 'status', status: 'loading', detail: 'Loading Python runtime…' });
    const mod = await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`);
    pyodide = (await mod.loadPyodide({ indexURL: PYODIDE_BASE })) as PyodideApi;
    // Install the tracing + security harness exactly once.
    pyodide.runPython(HARNESS_SOURCE);
    post({ type: 'status', status: 'ready', detail: 'Ready' });
  })();

  return loadPromise;
}

async function runUserCode(runId: number, code: string, input: string) {
  try {
    await ensurePyodide();
  } catch (err) {
    post({ type: 'fatal', message: `Failed to load Python runtime: ${String(err)}` });
    return;
  }
  if (!pyodide) {
    post({ type: 'fatal', message: 'Python runtime unavailable.' });
    return;
  }

  try {
    pyodide.globals.set('USER_CODE', code);
    pyodide.globals.set('USER_INPUT', input);
    const json = pyodide.runPython('_run(USER_CODE, USER_INPUT)') as string;
    const result = JSON.parse(json) as RunResult;
    post({ type: 'result', runId, result });
  } catch (err) {
    // A raw exception escaping the harness is unexpected — surface generically.
    post({
      type: 'result',
      runId,
      result: {
        ok: false,
        errorKind: 'runtime',
        message: `Unexpected error. Please reset and try again. (${String(err)})`,
        errorLine: null,
      },
    });
  }
}

self.onmessage = (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    void ensurePyodide();
  } else if (msg.type === 'run') {
    void runUserCode(msg.runId, msg.code, msg.input);
  }
};
