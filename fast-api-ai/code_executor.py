import ast
import traceback
import multiprocessing

TIME_LIMIT = 2  # seconds

SAFE_BUILTINS = {
    # Type constructors
    "int": int, "float": float, "str": str, "bool": bool,
    "list": list, "dict": dict, "tuple": tuple, "set": set,
    # Common builtins
    "len": len, "range": range, "print": print, "input": input,
    "sum": sum, "min": min, "max": max, "abs": abs,
    "sorted": sorted, "reversed": reversed,
    "enumerate": enumerate, "zip": zip, "map": map, "filter": filter,
    "isinstance": isinstance, "type": type, "hasattr": hasattr,
    "getattr": getattr, "round": round, "pow": pow, "divmod": divmod,
    "any": any, "all": all,
    "chr": chr, "ord": ord,
    "repr": repr, "id": id,
    # None/True/False
    "None": None, "True": True, "False": False,
}


def _try_literal(raw: str):
    """
    Attempt ast.literal_eval on raw.
    Returns (parsed_value, True) on success, (raw_string, False) on failure.
    """
    try:
        return ast.literal_eval(raw), True
    except Exception:
        return raw, False


def _safe_eval_input(raw_input: str):
    """
    Parse test case input into a tuple of args for the user function.

    The LLM sometimes stores inputs with quotes intact: "'hello'" or "1, 2".
    The JS frontend's String() call can strip those quotes, giving "hello".
    This function handles both cases robustly.

    Strategy:
      1. Wrap in tuple and try ast.literal_eval  →  covers well-formed literals.
      2. If that fails, split on commas and parse each part individually,
         treating any part that isn't a valid literal as a plain string.
      3. Last resort: return the whole raw value as a single string arg.
    """
    stripped = raw_input.strip()

    # Step 1: standard path — wrapping handles comma-separated multi-args too
    try:
        value = ast.literal_eval(f"({stripped},)")
        if isinstance(value, tuple) and len(value) == 1:
            return value   # single arg as 1-tuple
        return value
    except (ValueError, SyntaxError):
        pass

    # Step 2: fallback for quote-stripped input like "hello" instead of "'hello'"
    try:
        parts  = [p.strip() for p in stripped.split(",") if p.strip()]
        parsed = []
        for p in parts:
            val, ok = _try_literal(p)
            parsed.append(val)  # if literal parse failed, val is the raw string
        return tuple(parsed)
    except Exception:
        pass

    # Step 3: absolute last resort — single string arg
    return (stripped,)


def _safe_eval_expected(expected_raw: str):
    """
    Parse the expected output value.

    Handles:
      "'olleh'"  →  "olleh"   (str with quotes, LLM format)
      "olleh"    →  "olleh"   (str without quotes, JS String()-stripped)
      "True"     →  True      (bool)
      "5"        →  5         (int)
      "[1,2,3]"  →  [1,2,3]  (list)
    """
    stripped = expected_raw.strip()
    val, ok  = _try_literal(stripped)
    if ok:
        return val
    # Quotes were stripped by frontend — treat as a plain Python string
    return stripped


def run_test_case(user_code, function_name, raw_input, expected_raw, return_dict):
    try:
        execution_scope = {"__builtins__": SAFE_BUILTINS}
        exec(user_code, execution_scope, execution_scope)

        if function_name not in execution_scope:
            return_dict["error"] = f"Function '{function_name}' not found in submitted code."
            return

        user_function = execution_scope[function_name]

        args     = _safe_eval_input(raw_input)
        expected = _safe_eval_expected(expected_raw)

        output = user_function(*args)

        return_dict["output"]   = output
        return_dict["expected"] = expected
        return_dict["passed"]   = (output == expected)

    except ValueError as e:
        return_dict["error"]  = str(e)
        return_dict["passed"] = False
    except Exception:
        return_dict["error"]  = traceback.format_exc()
        return_dict["passed"] = False


def execute_submission(user_code: str, function_name: str, test_cases: list) -> dict:
    results = []
    passed  = 0

    for case in test_cases:
        manager     = multiprocessing.Manager()
        return_dict = manager.dict()

        process = multiprocessing.Process(
            target=run_test_case,
            args=(user_code, function_name, case["input"], case["expected"], return_dict),
        )

        process.start()
        process.join(TIME_LIMIT)

        if process.is_alive():
            process.terminate()
            process.join()
            results.append({
                "input":  case["input"],
                "error":  "Time Limit Exceeded",
                "passed": False,
            })
            continue

        if "error" in return_dict:
            results.append({
                "input":  case["input"],
                "error":  return_dict["error"],
                "passed": False,
            })
        else:
            if return_dict.get("passed"):
                passed += 1
            results.append({
                "input":    case["input"],
                "expected": return_dict.get("expected"),
                "output":   return_dict.get("output"),
                "passed":   return_dict.get("passed"),
            })

    return {
        "total":   len(test_cases),
        "passed":  passed,
        "failed":  len(test_cases) - passed,
        "details": results,
    }