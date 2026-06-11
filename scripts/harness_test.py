"""Validates the Python harness logic outside the browser.

Extracts the String.raw`...` block from src/worker/harness.ts, execs it, then
drives _run() against the example problems plus a set of security cases.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HARNESS_TS = os.path.join(ROOT, "src", "worker", "harness.ts")

with open(HARNESS_TS, "r", encoding="utf-8") as fh:
    ts = fh.read()

start = ts.index("String.raw`") + len("String.raw`")
end = ts.index("`;", start)
py_source = ts[start:end]

ns = {}
exec(compile(py_source, "<harness>", "exec"), ns)
_run = ns["_run"]


def run(code, inp):
    return json.loads(_run(code, inp=inp) if False else _run(code, inp))


def expect(name, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name} {extra}")
    if not cond:
        run.failed = True


# ---- Example 1: Two Sum ----
two_sum = """def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []"""
r = run(two_sum, "nums = [2, 7, 11, 15], target = 9")
expect("twoSum ok", r["ok"], )
expect("twoSum returns [0,1]", r.get("returnValue") == [0, 1], str(r.get("returnValue")))
expect("twoSum has steps", len(r.get("steps", [])) > 0, f"{len(r.get('steps', []))} steps")
# seen dict should appear in variables and be a real object
has_seen = any("seen" in s["variables"] for s in r["steps"])
expect("twoSum tracks seen", has_seen)

# ---- Example 2: Valid Parentheses ----
valid = """def isValid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack"""
r = run(valid, 's = "()[]{}"')
expect("isValid ok", r["ok"])
expect("isValid True", r.get("returnValue") is True, str(r.get("returnValue")))

# ---- Example 3: Binary Search ----
search = """def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1"""
r = run(search, "nums = [-1, 0, 3, 5, 9, 12], target = 9")
expect("search ok", r["ok"])
expect("search returns 4", r.get("returnValue") == 4, str(r.get("returnValue")))
# branch highlight should appear for while/if lines
has_branch = any(s["highlight"] == "branch" for s in r["steps"])
expect("search has branch highlights", has_branch)
has_return = any(s["highlight"] == "return" for s in r["steps"])
expect("search has return highlight", has_return)

# ---- Security: imports blocked ----
r = run("import os\ndef f():\n    return 1", "")
expect("import blocked", (not r["ok"]) and r["errorKind"] == "blocked-import", r.get("errorKind"))

# ---- Security: eval blocked ----
r = run("def f(x):\n    return eval(x)", "x = '1'")
expect("eval blocked", (not r["ok"]) and r["errorKind"] == "blocked-builtin", r.get("message"))

# ---- Security: dunder attribute blocked ----
r = run("def f():\n    return ().__class__", "")
expect("__class__ blocked", (not r["ok"]) and r["errorKind"] == "blocked", r.get("message"))

# ---- Security: with statement blocked ----
r = run("def f():\n    with open('x') as g:\n        return 1", "")
expect("with blocked", (not r["ok"]) and r["errorKind"] in ("blocked", "blocked-builtin"), r.get("message"))

# ---- Syntax error ----
r = run("def f(:\n   return 1", "")
expect("syntax error reported", (not r["ok"]) and r["errorKind"] == "syntax", r.get("message"))

# ---- Input parse failure ----
r = run("def f(x):\n    return x", "x = [1, 2")
expect("bad input reported", (not r["ok"]) and r["errorKind"] == "input-parse", r.get("message"))

# ---- Step limit (infinite loop) ----
r = run("def f():\n    i = 0\n    while True:\n        i += 1\n    return i", "")
expect("step limit reported", (not r["ok"]) and r["errorKind"] == "step-limit", r.get("message"))

# ---- Set serialization tagging ----
set_code = "def f():\n    s = set()\n    s.add(1)\n    s.add(2)\n    return len(s)"
r = run(set_code, "")
expect("set ok", r["ok"])
saw_set_tag = any(
    isinstance(s["variables"].get("s"), dict) and "__set__" in s["variables"]["s"]
    for s in r["steps"]
)
expect("set tagged as __set__", saw_set_tag)

# ---- NEW: arbitrary script mode (no function at all) ----
script = "total = 0\nfor x in [1, 2, 3]:\n    total += x"
r = run(script, "")
expect("script ok", r["ok"])
expect("script has steps", len(r.get("steps", [])) > 0, f"{len(r.get('steps', []))} steps")
final_total = None
for s in r["steps"]:
    if "total" in s["variables"]:
        final_total = s["variables"]["total"]
expect("script computes total=6", final_total == 6, str(final_total))

# ---- NEW: script that defines and calls its own function ----
own_call = "def add(a, b):\n    return a + b\nresult = add(2, 3)"
r = run(own_call, "")
expect("own-call ok", r["ok"])
traced_add = any(s["function"] == "add" for s in r["steps"])
expect("own-call traces add()", traced_add)
got_result = None
for s in r["steps"]:
    if "result" in s["variables"]:
        got_result = s["variables"]["result"]
expect("own-call result=5", got_result == 5, str(got_result))

# ---- NEW: multiple functions, auto-call best match by input ----
multi = ("def helper(x):\n    return x * 2\n"
         "def solve(nums):\n    return helper(nums[0])")
r = run(multi, "nums = [5]")
expect("multi ok", r["ok"])
expect("multi returns 10", r.get("returnValue") == 10, str(r.get("returnValue")))
traced_helper = any(s["function"] == "helper" for s in r["steps"])
expect("multi traces helper()", traced_helper)

# ---- NEW: input variables available to a script body ----
use_input = "doubled = [n * 2 for n in data]\nfirst = doubled[0]"
r = run(use_input, "data = [4, 5, 6]")
expect("input-var script ok", r["ok"])
first_val = None
for s in r["steps"]:
    if "first" in s["variables"]:
        first_val = s["variables"]["first"]
expect("input-var first=8", first_val == 8, str(first_val))

if getattr(run, "failed", False):
    print("\nSOME TESTS FAILED")
    sys.exit(1)
print("\nALL TESTS PASSED")
