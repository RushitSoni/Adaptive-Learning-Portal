import traceback
import multiprocessing
import sys

TIME_LIMIT = 2  # seconds

SAFE_BUILTINS = {
    "sum": sum,
    "len": len,
    "min": min,
    "max": max,
    "range": range,
    "abs": abs,
    "sorted": sorted,
    "enumerate": enumerate,
}

def run_test_case(user_code, function_name, raw_input, expected_raw, return_dict):
    try:
        execution_scope = {"__builtins__": SAFE_BUILTINS}
        exec(user_code, execution_scope, execution_scope)

        if function_name not in execution_scope:
            return_dict["error"] = f"Function '{function_name}' not found"
            return

        user_function = execution_scope[function_name]

        # Parse arguments safely
        args = eval(f"({raw_input})", {"__builtins__": SAFE_BUILTINS})
        if not isinstance(args, tuple):
            args = (args,)

        expected = eval(expected_raw, {"__builtins__": SAFE_BUILTINS})

        output = user_function(*args)

        return_dict["output"] = output
        return_dict["expected"] = expected
        return_dict["passed"] = output == expected

    except Exception:
        return_dict["error"] = traceback.format_exc()
        return_dict["passed"] = False


def execute_submission(user_code: str, function_name: str, test_cases: list):
    results = []
    passed = 0

    for case in test_cases:
        manager = multiprocessing.Manager()
        return_dict = manager.dict()

        process = multiprocessing.Process(
            target=run_test_case,
            args=(
                user_code,
                function_name,
                case["input"],
                case["expected"],
                return_dict,
            ),
        )

        process.start()
        process.join(TIME_LIMIT)

        if process.is_alive():
            process.terminate()
            process.join()

            results.append({
                "input": case["input"],
                "error": "Time Limit Exceeded",
                "passed": False
            })
            continue

        if "error" in return_dict:
            results.append({
                "input": case["input"],
                "error": return_dict["error"],
                "passed": False
            })
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