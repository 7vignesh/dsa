// Python source injected into Pyodide once at startup. It exposes a single
// entry point `_run(user_code, user_input)` that returns a JSON string matching
// the RunResult contract in ../types.ts.
//
// Security layers implemented here:
//   - Layer 2: AST static analysis gate (reject before execution)
//   - Layer 3: dangerous builtins overridden (defense in depth)
//   - Layer 4: 10,000 step limit enforced inside the tracer
//   - tracing harness via sys.settrace
//
// Note: real references to exec/compile are captured BEFORE the builtins are
// overridden, so the harness can still run validated user code while user code
// itself sees the blocked versions.

export const HARNESS_SOURCE = String.raw`
import ast as _ast
import sys as _sys
import json as _json
import builtins as _builtins

# Capture trusted references before we neuter the public builtins.
_REAL_EXEC = exec
_REAL_COMPILE = compile

_STEP_LIMIT = 10000
_VALUE_TRUNCATE = 500

_BLOCKED_CALLS = {
    'open', 'exec', 'eval', 'compile', '__import__', 'breakpoint', 'input',
    'getattr', 'setattr', 'delattr', 'vars', 'dir', 'globals', 'locals',
}

_BLOCKED_ATTRS = {
    '__class__', '__bases__', '__subclasses__', '__globals__', '__builtins__',
    '__dict__', '__code__', '__closure__', '__module__',
    'os', 'sys', 'subprocess', 'socket', 'requests', 'urllib', 'http',
    'pathlib', 'shutil',
}

_OVERRIDE_BUILTINS = [
    'open', 'exec', 'eval', 'compile', '__import__',
    'input', 'breakpoint', 'getattr', 'setattr', 'delattr',
]


class _BlockError(Exception):
    def __init__(self, kind, message, line=None):
        super().__init__(message)
        self.kind = kind
        self.message = message
        self.line = line


def _analyze(user_code):
    """Layer 2: static AST analysis. Raises _BlockError on any violation."""
    try:
        tree = _ast.parse(user_code, filename='<user>', mode='exec')
    except SyntaxError as exc:
        line = exc.lineno if exc.lineno else None
        raise _BlockError('syntax', exc.msg or 'invalid syntax', line)

    for node in _ast.walk(tree):
        if isinstance(node, (_ast.Import, _ast.ImportFrom)):
            raise _BlockError(
                'blocked-import',
                'Imports are not allowed in the visualizer.',
                getattr(node, 'lineno', None),
            )
        if isinstance(node, _ast.With) or isinstance(node, getattr(_ast, 'AsyncWith', ())):
            raise _BlockError(
                'blocked', "with statements", getattr(node, 'lineno', None)
            )
        if isinstance(node, (_ast.Global, _ast.Nonlocal)):
            raise _BlockError(
                'blocked', "global/nonlocal statements", getattr(node, 'lineno', None)
            )
        if isinstance(node, _ast.Call):
            fn = node.func
            name = None
            if isinstance(fn, _ast.Name):
                name = fn.id
            elif isinstance(fn, _ast.Attribute):
                name = fn.attr
            if name in _BLOCKED_CALLS:
                raise _BlockError('blocked-builtin', name, getattr(node, 'lineno', None))
        if isinstance(node, _ast.Attribute):
            if node.attr in _BLOCKED_ATTRS:
                raise _BlockError('blocked', node.attr, getattr(node, 'lineno', None))
        if isinstance(node, _ast.Name):
            if node.id in _BLOCKED_ATTRS:
                raise _BlockError('blocked', node.id, getattr(node, 'lineno', None))

    return tree


def _make_blocked(name):
    def _raise(*args, **kwargs):
        raise PermissionError("'%s' is blocked in the visualizer" % name)
    return _raise


def _safe_builtins():
    """Layer 3: a builtins mapping for the user namespace with dangerous
    entries replaced by raising stubs. Global builtins are never mutated, so
    the harness itself (and subsequent runs) stay intact."""
    safe = dict(_builtins.__dict__)
    for _fn in _OVERRIDE_BUILTINS:
        safe[_fn] = _make_blocked(_fn)
    return safe


def _branch_lines(tree):
    lines = set()
    for node in _ast.walk(tree):
        if isinstance(node, (_ast.If, _ast.While, _ast.For)):
            lines.add(getattr(node, 'lineno', -1))
    return lines


def _top_level_functions(tree):
    names = []
    for node in tree.body:
        if isinstance(node, _ast.FunctionDef):
            names.append(node.name)
    return names


def _has_top_level_exec(tree):
    """True if the module has runnable top-level statements beyond plain
    definitions/imports (i.e. the user wrote a full script that runs itself)."""
    for node in tree.body:
        if isinstance(node, (_ast.FunctionDef, _ast.ClassDef,
                             _ast.Import, _ast.ImportFrom)):
            continue
        if isinstance(node, getattr(_ast, 'AsyncFunctionDef', ())):
            continue
        # Module docstring is not "execution".
        if isinstance(node, _ast.Expr) and isinstance(node.value, _ast.Constant) \
                and isinstance(node.value.value, str):
            continue
        return True
    return False


def _func_params(fn):
    try:
        code = fn.__code__
        return list(code.co_varnames[:code.co_argcount])
    except Exception:
        return []


def _pick_target(func_names, user_ns, input_vars):
    """Choose which function to auto-invoke: the one whose parameters overlap
    the provided input variables the most; ties resolve to the last defined."""
    input_keys = set(input_vars.keys())
    best = None
    best_score = -1
    for name in func_names:
        fn = user_ns.get(name)
        if not callable(fn):
            continue
        params = _func_params(fn)
        score = len(input_keys.intersection(params))
        # Prefer higher overlap; on a tie keep the later-defined function.
        if score >= best_score:
            best_score = score
            best = name
    return best


def _select_kwargs(fn, input_vars):
    params = _func_params(fn)
    return {k: input_vars[k] for k in params if k in input_vars}


def _trunc_str(s):
    if len(s) > _VALUE_TRUNCATE:
        return s[:_VALUE_TRUNCATE] + ' …[truncated]'
    return s


def _serialize(v, depth=0):
    """Recursively build a JSON-safe deep copy.

    Sets/frozensets are tagged as {'__set__': [...]} so the frontend can render
    them distinctly; tuples become lists; non-serializable objects fall back to
    a repr() string (Layer 5 output sanitization)."""
    if depth > 12:
        return _trunc_str(repr(v))
    if v is None or isinstance(v, (bool, int, float)):
        return v
    if isinstance(v, str):
        return _trunc_str(v)
    if isinstance(v, (set, frozenset)):
        try:
            items = sorted(v, key=lambda x: repr(x))
        except Exception:
            items = list(v)
        return {'__set__': [_serialize(x, depth + 1) for x in items]}
    if isinstance(v, (list, tuple)):
        return [_serialize(x, depth + 1) for x in v]
    if isinstance(v, dict):
        out = {}
        for k, val in v.items():
            key = k if isinstance(k, str) else repr(k)
            out[key] = _serialize(val, depth + 1)
        return out
    try:
        return _trunc_str(repr(v))
    except Exception:
        return '<unrepresentable>'


def _safe_value(v):
    """Serialize a local into a JSON-safe value, with truncation for strings."""
    return _serialize(v)


def _parse_input(user_input):
    """Parse 'a = [1,2], b = 3' style input into a kwargs dict via ast."""
    text = (user_input or '').strip()
    if not text:
        return {}
    try:
        wrapped = _ast.parse('__call__(' + text + ')', mode='eval')
    except SyntaxError:
        raise _BlockError(
            'input-parse',
            'Could not parse input — use Python literal syntax (e.g. nums = [1,2,3])',
        )
    call = wrapped.body
    if not isinstance(call, _ast.Call):
        raise _BlockError('input-parse', 'Could not parse input.')
    kwargs = {}
    for kw in call.keywords:
        if kw.arg is None:
            raise _BlockError('input-parse', 'Input must use name = value pairs.')
        try:
            kwargs[kw.arg] = _ast.literal_eval(kw.value)
        except Exception:
            raise _BlockError(
                'input-parse',
                'Could not parse input — use Python literal syntax (e.g. nums = [1,2,3])',
            )
    # Positional args (e.g. plain literals) are not supported in v1.
    if call.args:
        raise _BlockError('input-parse', 'Input must use name = value pairs.')
    return kwargs


def _run(user_code, user_input):
    trace_log = []

    def fail(kind, message, line=None):
        return _json.dumps({
            'ok': False,
            'errorKind': kind,
            'message': message,
            'errorLine': line,
        })

    # ---- Layer 2: AST gate ----
    try:
        tree = _analyze(user_code)
    except _BlockError as exc:
        return fail(exc.kind, exc.message, exc.line)

    branch = _branch_lines(tree)
    func_names = _top_level_functions(tree)
    has_exec = _has_top_level_exec(tree)

    # ---- parse input (a dict of name -> value) ----
    try:
        input_vars = _parse_input(user_input)
    except _BlockError as exc:
        return fail(exc.kind, exc.message, exc.line)

    # Compile the user code.
    try:
        code_obj = _REAL_COMPILE(user_code, '<user>', 'exec')
    except SyntaxError as exc:
        return fail('syntax', exc.msg or 'invalid syntax', exc.lineno)

    # Input variables are injected as globals so a script can reference them.
    user_ns = {'__builtins__': _safe_builtins()}
    user_ns.update(input_vars)

    user_ns = {'__builtins__': _safe_builtins()}
    user_ns.update(input_vars)

    step_overflow = [False]

    def _tracer(frame, event, arg):
        if frame.f_code.co_filename != '<user>':
            return _tracer
        if event not in ('line', 'call', 'return'):
            return _tracer
        # Skip the synthetic 'call' of the module frame, but keep its 'return'
        # so the final top-level variable state (after the last line) is shown.
        if frame.f_code.co_name == '<module>' and event == 'call':
            return _tracer
        if len(trace_log) >= _STEP_LIMIT:
            step_overflow[0] = True
            raise RuntimeError('Step limit exceeded')

        local_vars = {}
        for k, v in frame.f_locals.items():
            if k.startswith('_'):
                continue
            local_vars[k] = _safe_value(v)

        # Build the call stack from user frames currently on the stack.
        stack = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == '<user>':
                stack.append(f.f_code.co_name)
            f = f.f_back
        stack.reverse()

        line_no = frame.f_lineno
        if event == 'return':
            highlight = 'return'
        elif line_no in branch:
            highlight = 'branch'
        else:
            highlight = 'normal'

        trace_log.append({
            'line': line_no,
            'event': event,
            'variables': local_vars,
            'function': frame.f_code.co_name,
            'callStack': stack,
            'highlight': highlight,
        })
        return _tracer

    return_value = None
    runtime_error = None

    def _drive():
        # Two execution modes:
        #  - script mode: the code has runnable top-level statements, so we
        #    trace the whole module as it runs.
        #  - function mode: the code only defines functions, so we define them
        #    untraced, then auto-invoke the best-matching one with the input.
        if has_exec:
            _sys.settrace(_tracer)
            try:
                _REAL_EXEC(code_obj, user_ns)
            finally:
                _sys.settrace(None)
            return None
        # function mode
        _REAL_EXEC(code_obj, user_ns)
        if not func_names:
            return None
        target_name = _pick_target(func_names, user_ns, input_vars)
        target = user_ns.get(target_name) if target_name else None
        if not callable(target):
            return None
        call_kwargs = _select_kwargs(target, input_vars)
        _sys.settrace(_tracer)
        try:
            return target(**call_kwargs)
        finally:
            _sys.settrace(None)

    try:
        return_value = _drive()
    except RuntimeError as exc:
        if step_overflow[0]:
            runtime_error = ('step-limit',
                             'Exceeded 10,000 steps — check for an infinite loop.')
        else:
            runtime_error = ('runtime', '%s: %s' % (type(exc).__name__, exc))
    except Exception as exc:
        runtime_error = ('runtime', '%s: %s' % (type(exc).__name__, exc))
    finally:
        _sys.settrace(None)

    if runtime_error is not None:
        kind, message = runtime_error
        if kind == 'step-limit':
            return fail(kind, message, None)
        # Attach the line of the last executed step if available.
        err_line = trace_log[-1]['line'] if trace_log else None
        return fail('runtime', message, err_line)

    trace_lines = sorted({s['line'] for s in trace_log})

    return _json.dumps({
        'ok': True,
        'steps': trace_log,
        'traceLines': trace_lines,
        'returnValue': _safe_value(return_value),
    })
`;
