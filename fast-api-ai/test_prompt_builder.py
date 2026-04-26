def build_test_prompt(
    topic: str,
    difficulty: str,
    context: str,
    mcq_count: int,
    code_io_count: int,
    coding_count: int
) -> str:
    """
    Build a prompt that instructs the LLM to generate a structured JSON quiz
    using ONLY the provided context.
    """

    difficulty_guide = {
        "easy":   "Use basic definitions, simple syntax, and straightforward single-concept examples. Avoid nested logic.",
        "medium": "Include edge cases, moderate logic, and multi-step reasoning. Functions may have 2-3 parameters.",
        "hard":   "Include complex scenarios, tricky edge cases, advanced usage, and non-obvious outputs."
    }.get(difficulty, "Use moderate difficulty.")

    return f"""You are a Python quiz generator. Your output will be parsed directly as JSON by a program.
Any mistake in format or any incomplete content will crash the system.

Difficulty: {difficulty.upper()} — {difficulty_guide}

Reference Material (use ONLY this):
{context}

---

TASK: Generate exactly:
- {mcq_count} MCQ questions
- {code_io_count} Code Output questions
- {coding_count} Coding challenge questions

---

STRICT RULES — violating any rule is a critical failure:

### MCQ Rules:
- Every question must be fully self-contained. Do NOT reference "the following code" or "the code above" unless you include the actual code in the question text itself.
- If a question involves code, embed the code snippet directly inside the "question" field using a newline and indentation — do not put it in a separate field.
- All 4 options must be plausible. The correct_answer must be "A", "B", "C", or "D".
- No question may have a variable like `n`, `x`, `lst` that is referenced but never defined within the question.

### Code Output Rules:
- The "code" field must contain COMPLETE, RUNNABLE Python code. It must not reference any variable or function that is not defined within that same code block.
- The "expected_output" must be the exact string printed to stdout, including newlines if any. If it prints multiple lines, separate them with \\n.
- Do NOT write questions like "what does this function return" — the code must use print() so there is actual output.
- Every variable used in the code must be defined in the code. No undefined `n`, `x`, or external inputs.
- If the code defines a function (e.g. `def f(n): ...`), it must also call that function with a concrete argument to answer what will it print as the result. Never define a function and leave it uncalled — the student has no way to determine the output without knowing what arguments were passed.
-Give question that will have ans in one line.

### Coding Challenge Rules:
- The "question" field must fully describe the problem including input types, output type, and at least one example.
- The "function_name" must match exactly what is used in test_cases inputs.
- "test_cases" must have EXACTLY 10 items covering: normal cases, boundary values, empty inputs, single element, large values, negative numbers (if applicable), duplicates, and any edge cases specific to the problem.
- Every test case "input" must be a valid Python expression string that can be passed as argument(s) to the function. Example: "([1,2,3])" or "(5)" or "('hello', 3)".
- Every test case "expected" must be the exact return value as a Python literal. Example: 6 or "hello" or [1,2] or True.
- Do NOT use undefined variables in test cases. Each test case must be fully standalone.

---

Return ONLY valid JSON in this exact format. No markdown. No explanation. No text before or after the JSON.

{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "mcq": [
    {{
      "id": 1,
      "question": "Complete self-contained question text. If code is involved, include it here:\\n\\nx = [1, 2, 3]\\nprint(x[1])\\n\\nWhat is the output?",
      "options": {{"A": "1", "B": "2", "C": "3", "D": "Error"}},
      "correct_answer": "B",
      "explanation": "List indices start at 0, so x[1] is 2."
    }}
  ],
  "code_io": [
    {{
      "id": 1,
      "code": "def add(a, b):\\n    return a + b\\n\\nresult = add(3, 4)\\nprint(result)",
      "question": "What is the output of this code?",
      "expected_output": "7"
    }}
  ],
  "coding": [
    {{
      "id": 1,
      "question": "Write a function called `sum_list` that takes a list of integers and returns their sum. Example: sum_list([1, 2, 3]) returns 6.",
      "function_name": "sum_list",
      "test_cases": [
        {{"input": "([1, 2, 3])", "expected": 6}},
        {{"input": "([0])", "expected": 0}},
        {{"input": "([])", "expected": 0}},
        {{"input": "([-1, -2, -3])", "expected": -6}},
        {{"input": "([100, 200, 300])", "expected": 600}},
        {{"input": "([1])", "expected": 1}},
        {{"input": "([0, 0, 0])", "expected": 0}},
        {{"input": "([-1, 1])", "expected": 0}},
        {{"input": "([10, 20, 30, 40])", "expected": 100}},
        {{"input": "([999])", "expected": 999}}
      ]
    }}
  ]
}}

Now generate the actual quiz for topic "{topic}" following every rule above. Return ONLY the JSON.
"""