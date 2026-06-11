import type {
  RawStep,
  StepSnapshot,
  DetectedStructure,
  StructureType,
  VariableValue,
} from '../types';

interface SetTag {
  __set__: unknown[];
}

function isSetTag(v: unknown): v is SetTag {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, '__set__')
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !isSetTag(v);
}

function isTreeNode(v: unknown): boolean {
  return isPlainObject(v) && 'left' in v && 'right' in v;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

type MutationKind = 'append' | 'popEnd' | 'popFront' | 'prepend' | 'indexed' | 'none';

function classifyArrayMutation(prev: unknown[], next: unknown[]): MutationKind {
  if (next.length === prev.length) {
    return deepEqual(prev, next) ? 'none' : 'indexed';
  }
  if (next.length === prev.length + 1) {
    if (deepEqual(prev, next.slice(0, prev.length))) return 'append';
    if (deepEqual(prev, next.slice(1))) return 'prepend';
  }
  if (next.length === prev.length - 1) {
    if (deepEqual(next, prev.slice(0, next.length))) return 'popEnd';
    if (deepEqual(next, prev.slice(1))) return 'popFront';
  }
  return 'indexed';
}

/** Decide the structure type for one variable using its full value history. */
function classifyVariable(history: VariableValue[]): StructureType | null {
  let sawDict = false;
  let sawArray = false;
  let sawTree = false;
  let sawSet = false;

  for (const v of history) {
    if (isSetTag(v)) sawSet = true;
    else if (isTreeNode(v)) sawTree = true;
    else if (isPlainObject(v)) sawDict = true;
    else if (Array.isArray(v)) sawArray = true;
  }

  if (sawTree) return 'tree';
  if (sawSet) return 'set';
  if (sawDict) return 'hashmap';
  if (sawArray) {
    const arrays = history.filter(Array.isArray) as unknown[][];
    let sawPopFront = false;
    let sawEndMutation = false;
    for (let i = 1; i < arrays.length; i++) {
      const kind = classifyArrayMutation(arrays[i - 1], arrays[i]);
      if (kind === 'popFront' || kind === 'prepend') sawPopFront = true;
      if (kind === 'append' || kind === 'popEnd') sawEndMutation = true;
    }
    if (sawPopFront) return 'queue';
    if (sawEndMutation) return 'stack';
    return 'array';
  }
  return null;
}

function collectHistories(steps: RawStep[]): Map<string, VariableValue[]> {
  const histories = new Map<string, VariableValue[]>();
  for (const step of steps) {
    for (const [name, value] of Object.entries(step.variables)) {
      if (!histories.has(name)) histories.set(name, []);
      histories.get(name)!.push(value);
    }
  }
  return histories;
}

// Render priority for ordering structures within a step (most "interesting" first).
const TYPE_PRIORITY: Record<StructureType, number> = {
  tree: 0,
  hashmap: 1,
  stack: 2,
  queue: 3,
  set: 4,
  array: 5,
};

/**
 * Runs once on the full trace. Classifies each variable to a structure type,
 * then attaches per-step DetectedStructure entries (with active indices/keys)
 * to produce the StepSnapshot array consumed during playback.
 */
export function buildSnapshots(steps: RawStep[]): StepSnapshot[] {
  const histories = collectHistories(steps);
  const types = new Map<string, StructureType>();
  for (const [name, history] of histories) {
    const t = classifyVariable(history);
    if (t) types.set(name, t);
  }

  return steps.map((step, idx) => {
    const prev = idx > 0 ? steps[idx - 1] : null;
    const structures: DetectedStructure[] = [];

    for (const [name, value] of Object.entries(step.variables)) {
      const type = types.get(name);
      if (!type) continue;

      const structure: DetectedStructure = { name, type, value };

      if (type === 'array') {
        // Highlight integer-valued locals that point into this array.
        const len = Array.isArray(value) ? value.length : 0;
        const active: number[] = [];
        for (const [vn, vv] of Object.entries(step.variables)) {
          if (vn === name) continue;
          if (typeof vv === 'number' && Number.isInteger(vv) && vv >= 0 && vv < len) {
            active.push(vv);
          }
        }
        if (active.length) structure.activeIndices = [...new Set(active)].sort((a, b) => a - b);
      }

      if (type === 'hashmap' && isPlainObject(value)) {
        const prevVal = prev?.variables[name];
        const changed: string[] = [];
        for (const key of Object.keys(value)) {
          if (!isPlainObject(prevVal) || !deepEqual(prevVal[key], value[key])) {
            changed.push(key);
          }
        }
        if (changed.length) structure.activeKeys = changed;
      }

      if (type === 'stack' && Array.isArray(value) && value.length) {
        structure.activeIndices = [value.length - 1];
      }

      structures.push(structure);
    }

    structures.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);

    return {
      line: step.line,
      event: step.event,
      variables: step.variables,
      function: step.function,
      callStack: step.callStack,
      highlight: step.highlight,
      dataStructures: structures,
    };
  });
}
