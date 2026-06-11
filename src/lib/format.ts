// Value formatting for display. React escapes all interpolated strings, so
// rendering these via {value} (textContent) never injects HTML (Layer 5).

const MAX_DISPLAY = 500;

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

export function formatValue(v: unknown): string {
  let out: string;
  if (v === null) out = 'None';
  else if (v === true) out = 'True';
  else if (v === false) out = 'False';
  else if (typeof v === 'string') out = JSON.stringify(v);
  else if (typeof v === 'number') out = String(v);
  else if (isSetTag(v)) out = `{${v.__set__.map(formatValue).join(', ')}}`;
  else if (Array.isArray(v)) out = `[${v.map(formatValue).join(', ')}]`;
  else if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>).map(
      ([k, val]) => `${k}: ${formatValue(val)}`,
    );
    out = `{${entries.join(', ')}}`;
  } else out = String(v);

  if (out.length > MAX_DISPLAY) {
    return out.slice(0, MAX_DISPLAY) + ' …[truncated]';
  }
  return out;
}

/** Compact form for a single cell (no surrounding brackets for primitives). */
export function formatCell(v: unknown): string {
  if (typeof v === 'string') return v;
  return formatValue(v);
}

/** True when the value fell back to a repr() string the worker could not serialize. */
export function isReprFallback(v: unknown): boolean {
  return (
    typeof v === 'string' &&
    /^<.*>$/.test(v.trim())
  );
}
