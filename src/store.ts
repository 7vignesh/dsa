import { create } from 'zustand';
import type { StepSnapshot, RunResult } from './types';
import { pyodideClient, type RuntimeStatus } from './lib/pyodideClient';
import { buildSnapshots } from './lib/detectStructures';
import { EXAMPLES } from './examples';

export const MAX_CODE_LENGTH = 5000;
export const MAX_INPUT_LENGTH = 2000;

const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
const BASE_INTERVAL_MS = 700;

export type Phase = 'editing' | 'running' | 'playback';

export interface AppError {
  message: string;
  line: number | null;
}

interface AppState {
  code: string;
  input: string;
  phase: Phase;
  runtimeStatus: RuntimeStatus;
  runtimeDetail: string;

  steps: StepSnapshot[];
  traceLines: number[];
  returnValue: unknown;
  currentStep: number;

  isPlaying: boolean;
  speed: number;
  error: AppError | null;

  // actions
  setCode: (code: string) => void;
  setInput: (input: string) => void;
  loadExample: (id: string) => void;
  visualize: () => Promise<void>;
  reset: () => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBack: () => void;
  jumpStart: () => void;
  jumpEnd: () => void;
  goToStep: (index: number) => void;
  setSpeed: (speed: number) => void;

  initRuntime: () => void;
}

let playTimer: ReturnType<typeof setInterval> | null = null;

function userMessage(result: Extract<RunResult, { ok: false }>): string {
  switch (result.errorKind) {
    case 'syntax':
      return result.errorLine
        ? `SyntaxError at line ${result.errorLine}: ${result.message}`
        : `SyntaxError: ${result.message}`;
    case 'blocked-builtin':
      return `Blocked: '${result.message}' is not allowed. Only pure functions.`;
    case 'blocked-import':
      return 'Blocked: Imports are not allowed in the visualizer.';
    case 'blocked':
      return `Blocked: '${result.message}' is not allowed. Only pure algorithmic functions are supported.`;
    case 'step-limit':
      return 'Exceeded 10,000 steps — check for an infinite loop.';
    case 'input-parse':
      return result.message;
    case 'runtime':
    default:
      return result.message;
  }
}

export const useStore = create<AppState>((set, get) => ({
  code: EXAMPLES[0].code,
  input: EXAMPLES[0].input,
  phase: 'editing',
  runtimeStatus: 'idle',
  runtimeDetail: '',

  steps: [],
  traceLines: [],
  returnValue: undefined,
  currentStep: 0,

  isPlaying: false,
  speed: 1,
  error: null,

  setCode: (code) => set({ code }),
  setInput: (input) => set({ input }),

  loadExample: (id) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    get().reset();
    set({ code: ex.code, input: ex.input });
  },

  visualize: async () => {
    const { code, input, phase } = get();
    if (phase === 'running') return;

    if (code.length > MAX_CODE_LENGTH) {
      set({ error: { message: 'Code exceeds 5,000 character limit.', line: null } });
      return;
    }
    if (input.length > MAX_INPUT_LENGTH) {
      set({ error: { message: 'Input exceeds 2,000 character limit.', line: null } });
      return;
    }

    set({ phase: 'running', error: null, isPlaying: false });
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }

    const result = await pyodideClient.run(code, input);

    if (!result.ok) {
      set({
        phase: 'editing',
        error: { message: userMessage(result), line: result.errorLine },
        steps: [],
        traceLines: [],
      });
      return;
    }

    const snapshots = buildSnapshots(result.steps);
    if (snapshots.length === 0) {
      set({
        phase: 'editing',
        error: { message: 'No executable steps were traced.', line: null },
      });
      return;
    }

    set({
      phase: 'playback',
      steps: snapshots,
      traceLines: result.traceLines,
      returnValue: result.returnValue,
      currentStep: 0,
      error: null,
    });
  },

  reset: () => {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    set({
      phase: 'editing',
      steps: [],
      traceLines: [],
      returnValue: undefined,
      currentStep: 0,
      isPlaying: false,
      error: null,
    });
  },

  play: () => {
    const { steps, currentStep, speed } = get();
    if (steps.length === 0) return;
    if (currentStep >= steps.length - 1) {
      set({ currentStep: 0 });
    }
    if (playTimer) clearInterval(playTimer);
    set({ isPlaying: true });
    playTimer = setInterval(() => {
      const { currentStep: c, steps: s } = get();
      if (c >= s.length - 1) {
        get().pause();
        return;
      }
      set({ currentStep: c + 1 });
    }, BASE_INTERVAL_MS / speed);
  },

  pause: () => {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    set({ isPlaying: false });
  },

  togglePlay: () => {
    if (get().isPlaying) get().pause();
    else get().play();
  },

  stepForward: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) set({ currentStep: currentStep + 1 });
  },

  stepBack: () => {
    const { currentStep } = get();
    if (currentStep > 0) set({ currentStep: currentStep - 1 });
  },

  jumpStart: () => set({ currentStep: 0 }),
  jumpEnd: () => set((s) => ({ currentStep: Math.max(0, s.steps.length - 1) })),

  goToStep: (index) => {
    const { steps } = get();
    const clamped = Math.max(0, Math.min(index, steps.length - 1));
    set({ currentStep: clamped });
  },

  setSpeed: (speed) => {
    set({ speed });
    if (get().isPlaying) {
      get().pause();
      get().play();
    }
  },

  initRuntime: () => {
    pyodideClient.onStatus((status, detail) =>
      set({ runtimeStatus: status, runtimeDetail: detail ?? '' }),
    );
    pyodideClient.init();
    set({
      runtimeStatus: pyodideClient.getStatus(),
      runtimeDetail: pyodideClient.getDetail(),
    });
  },
}));

export { SPEEDS };
