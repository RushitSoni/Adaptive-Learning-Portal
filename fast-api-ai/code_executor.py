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


def _safe_eval_input(raw_input: str):
    """
    Safely parse test case input using ast.literal_eval.
    Supports: int, float, str, list, tuple, dict, bool, None.
    """
    try:
        # Wrap in tuple to allow comma-separated multiple args
        value = ast.literal_eval(f"({raw_input},)")
        if isinstance(value, tuple) and len(value) == 1:
            return value  # single arg, still as tuple
        return value
    except Exception:
        raise ValueError(f"Could not parse test input: {raw_input!r}. "
                         "Use Python literals only (e.g. 5, 'hello', [1,2,3]).")


def run_test_case(user_code, function_name, raw_input, expected_raw, return_dict):
    try:
        execution_scope = {"__builtins__": SAFE_BUILTINS}
        exec(user_code, execution_scope, execution_scope)

        if function_name not in execution_scope:
            return_dict["error"] = f"Function '{function_name}' not found in submitted code."
            return

        user_function = execution_scope[function_name]

        # Safe input parsing
        args = _safe_eval_input(raw_input)
        expected = ast.literal_eval(expected_raw)

        output = user_function(*args)

        return_dict["output"] = output
        return_dict["expected"] = expected
        return_dict["passed"] = output == expected

    except ValueError as e:
        return_dict["error"] = str(e)
        return_dict["passed"] = False
    except Exception:
        return_dict["error"] = traceback.format_exc()
        return_dict["passed"] = False


def execute_submission(user_code: str, function_name: str, test_cases: list) -> dict:
    results = []
    passed = 0

    for case in test_cases:
        manager = multiprocessing.Manager()
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
            results.append({"input": case["input"], "error": "Time Limit Exceeded", "passed": False})
            continue

        if "error" in return_dict:
            results.append({"input": case["input"], "error": return_dict["error"], "passed": False})
        else:
            if return_dict.get("passed"):
                passed += 1
            results.append({
                "input": case["input"],
                "expected": return_dict.get("expected"),
                "output": return_dict.get("output"),
                "passed": return_dict.get("passed")
            })

    return {
        "total": len(test_cases),
        "passed": passed,
        "failed": len(test_cases) - passed,
        "details": results
    }