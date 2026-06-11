// Shared type contracts used across the worker boundary and the UI.

export type Primitive = string | number | boolean | null;
export type VariableValue = Primitive | unknown[] | Record<string, unknown>;

export type StructureType =
  | 'array'
  | 'hashmap'
  | 'stack'
  | 'queue'
  | 'tree'
  | 'set';

export interface DetectedStructure {
  name: string;
  type: StructureType;
  value: unknown;
  activeIndices?: number[];
  activeKeys?: string[];
}

export type HighlightKind = 'normal' | 'branch' | 'return' | 'error';
export type TraceEvent = 'line' | 'call' | 'return';

export interface IterationContext {
  loopVariable: string;
  currentValue: unknown;
  iterationNumber: number;
}

export interface StepSnapshot {
  line: number;
  event: TraceEvent;
  variables: Record<string, VariableValue>;
  function: string;
  callStack: string[];
  dataStructures: DetectedStructure[];
  highlight: HighlightKind;
  iterationContext?: IterationContext;
}

/**
 * Raw step shape produced by the Python tracing harness, before the frontend
 * runs data-structure auto-detection. `callStack` and `highlight` are provided
 * by the harness; `dataStructures` is filled in on the main thread.
 */
export interface RawStep {
  line: number;
  event: TraceEvent;
  variables: Record<string, VariableValue>;
  function: string;
  callStack: string[];
  highlight: HighlightKind;
  branchLines?: number[];
}

export interface RunSuccess {
  ok: true;
  steps: RawStep[];
  traceLines: number[];
  returnValue: VariableValue;
}

export interface RunFailure {
  ok: false;
  errorKind:
    | 'syntax'
    | 'blocked-builtin'
    | 'blocked-import'
    | 'blocked'
    | 'step-limit'
    | 'input-parse'
    | 'runtime';
  message: string;
  errorLine: number | null;
}

export type RunResult = RunSuccess | RunFailure;

// ---- Worker <-> main thread messages ----

export type WorkerInbound =
  | { type: 'init' }
  | { type: 'run'; runId: number; code: string; input: string };

export type WorkerOutbound =
  | { type: 'status'; status: 'loading' | 'ready'; detail?: string }
  | { type: 'result'; runId: number; result: RunResult }
  | { type: 'fatal'; message: string };
