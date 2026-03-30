"""
prompt_router.py — Prompt Builder with 8 RL-Driven Teaching Strategies

query_type classification (for both prompt routing and RL state):
  conceptual  → "what is", "define", "explain"
  debug       → "my code", "fix this", "error"
  compare     → "difference", "vs", "compare"
  application → "how to", "implement", "write a"

Teaching strategies (actions) injected by RL policy:
  step_by_step     numbered micro-steps with inline comments
  code_first       working snippet first, then explanation
  analogy_first    real-world analogy before any code
  trace_through    line-by-line execution walkthrough
  mistake_focused  wrong code first, then corrected version
  minimal_example  smallest possible working example
  socratic         guiding questions instead of direct answer
  compare_contrast two approaches side by side
"""

SYLLABUS_RULE = """
STRICT RULE: Answer ONLY using information from the Context provided above.
If the answer is not present in the context, respond with exactly:
"This topic is not covered in the current syllabus material."
Do NOT use any outside knowledge or make up information.
"""


# ── Query Type Classification ─────────────────────────────────────────────────

def classify_query_type(question: str) -> str:
    """
    3-way classification used by existing build_prompt() routing.
    Kept for backward compatibility with existing endpoints.
    """
    q = question.lower()

    debug_signals = ["my code", "this code", "fix this", "debug this",
                     "what's wrong", "not working", "getting error in"]
    if any(sig in q for sig in debug_signals):
        return "debug"

    if "define" in q or "1-2 lines" in q or "short" in q or "what is" in q:
        return "short"

    return "full"


def classify_query_type_for_rl(question: str) -> str:
    """
    4-way classification used by RL state builder.
    More granular than classify_query_type().
    """
    q = question.lower()

    debug_signals = ["my code", "this code", "fix this", "debug",
                     "what's wrong", "not working", "getting error"]
    if any(s in q for s in debug_signals):
        return "debug"

    compare_signals = ["difference", "compare", "vs", "versus",
                       "better", "which one", "when to use"]
    if any(s in q for s in compare_signals):
        return "compare"

    app_signals = ["how do i", "how to", "implement", "write a",
                   "create a", "build", "make a", "can i use"]
    if any(s in q for s in app_signals):
        return "application"

    return "conceptual"


def determine_top_k(question: str) -> int:
    q = question.lower()
    if "define" in q or "short" in q or "what is" in q:
        return 2
    if "compare" in q or "difference" in q or "vs" in q:
        return 5
    if "debug" in q or "fix" in q or "my code" in q:
        return 4
    return 3


# ── Strategy Prompt Builders ──────────────────────────────────────────────────

def _strategy_step_by_step(question: str, context: str) -> str:
    return f"""Using ONLY the context below, answer the question using numbered micro-steps.
Break down the concept into clear sequential steps.
Add inline code comments to every code snippet.
End with one short practice exercise.

Context:
{context}

Question:
{question}

Format:
Step 1: ...
Step 2: ...
[code with inline comments]
Step N: ...
Practice: ...

{SYLLABUS_RULE}"""


def _strategy_code_first(question: str, context: str) -> str:
    return f"""Using ONLY the context below, answer by showing a complete working code example FIRST.
Then explain what the code does, line by line.
Then summarise the key concept in 2-3 sentences.

Context:
{context}

Question:
{question}

Format:
[Working code example]
Explanation: ...
Key Concept: ...

{SYLLABUS_RULE}"""


def _strategy_analogy_first(question: str, context: str) -> str:
    return f"""Using ONLY the context below, start with a real-world analogy that maps to this Python concept.
Then connect the analogy to actual Python syntax/behaviour.
Then show a code example that reinforces the analogy.

Context:
{context}

Question:
{question}

Format:
Analogy: [real-world comparison]
How it maps to Python: ...
Code Example: ...
Key Takeaway: ...

{SYLLABUS_RULE}"""


def _strategy_trace_through(question: str, context: str) -> str:
    return f"""Using ONLY the context below, walk through code execution step by step.
Show the value of each variable at each step.
Use a table or numbered trace format to show state changes.
Explain WHY each step happens.

Context:
{context}

Question:
{question}

Format:
Code:
[code snippet]

Trace:
Line 1: [what happens, variable values]
Line 2: [what happens, variable values]
...
Final Output: ...
Why this matters: ...

{SYLLABUS_RULE}"""


def _strategy_mistake_focused(question: str, context: str) -> str:
    return f"""Using ONLY the context below, first show a COMMON WRONG version of the code.
Explain exactly why it is wrong and what error/bug it causes.
Then show the CORRECT version.
Then explain the key rule that prevents this mistake.

Context:
{context}

Question:
{question}

Format:
❌ Common Mistake:
[wrong code]
Why this fails: ...

✅ Correct Version:
[correct code]
The Rule: ...

{SYLLABUS_RULE}"""


def _strategy_minimal_example(question: str, context: str) -> str:
    return f"""Using ONLY the context below, provide the SMALLEST possible working example.
No extra features, no edge cases — just the core concept in the fewest lines possible.
Then state the one rule this example demonstrates.

Context:
{context}

Question:
{question}

Format:
Minimal Example:
[shortest working code]

This demonstrates: [one clear rule]
When you'd use this: ...

{SYLLABUS_RULE}"""


def _strategy_socratic(question: str, context: str) -> str:
    return f"""Using ONLY the context below, do NOT answer the question directly.
Instead, ask 2-3 guiding questions that lead the student to discover the answer themselves.
Each question should build on the previous one.
After the questions, provide a small hint (not the full answer).

Context:
{context}

Question:
{question}

Format:
Let's think through this together:
Q1: ...
Q2: ...
Q3: ...
Hint: [directional nudge, not the answer]

{SYLLABUS_RULE}"""


def _strategy_compare_contrast(question: str, context: str) -> str:
    return f"""Using ONLY the context below, present two approaches/concepts side by side.
Use a clear comparison format showing similarities, differences, and when to use each.
Include a code example for each approach.

Context:
{context}

Question:
{question}

Format:
Approach A: [name]
[code example A]

Approach B: [name]
[code example B]

| Aspect       | Approach A | Approach B |
|--------------|------------|------------|
| Use when     | ...        | ...        |
| Advantage    | ...        | ...        |
| Disadvantage | ...        | ...        |

Recommendation: ...

{SYLLABUS_RULE}"""


# ── Strategy Dispatcher ───────────────────────────────────────────────────────

STRATEGY_MAP = {
    "step_by_step":    _strategy_step_by_step,
    "code_first":      _strategy_code_first,
    "analogy_first":   _strategy_analogy_first,
    "trace_through":   _strategy_trace_through,
    "mistake_focused": _strategy_mistake_focused,
    "minimal_example": _strategy_minimal_example,
    "socratic":        _strategy_socratic,
    "compare_contrast":_strategy_compare_contrast,
}


def build_prompt_with_strategy(
    question: str,
    context: str,
    strategy: str
) -> str:
    """
    Build a prompt using the RL-selected teaching strategy.
    Called by /chat endpoint when student_id is present.

    Args:
        question : student's question
        context  : RAG-retrieved context text
        strategy : action chosen by RL policy

    Returns:
        prompt string ready for LLM
    """
    builder = STRATEGY_MAP.get(strategy)
    if not builder:
        # Fallback to code_first if unknown strategy
        builder = _strategy_code_first

    return builder(question, context)


# ── Legacy build_prompt (kept for /hint, /summarise, non-student chat) ────────

def build_prompt(query_type: str, question: str, context: str) -> str:
    """
    Original 3-way prompt builder.
    Still used when no student_id is provided (anonymous chat).
    """
    if query_type == "short":
        return f"""Answer the question in 1-2 lines only using the context below.

Context:
{context}

Question:
{question}

{SYLLABUS_RULE}"""

    elif query_type == "debug":
        return f"""You are helping debug Python code. Use ONLY the context below to explain the fix.

Context:
{context}

Question:
{question}

{SYLLABUS_RULE}"""

    else:
        return f"""Using ONLY the context below, provide a structured explanation:

1. Clear Explanation
2. Code Example (from context)
3. Common Mistakes
4. Edge Cases
5. Short Practice Question

Context:
{context}

Question:
{question}

{SYLLABUS_RULE}"""


def build_hint_prompt(question: str, context: str) -> str:
    return f"""You are a Python tutor giving a HINT, not a full answer.
Give a short directional nudge (1-3 sentences) that points the student
in the right direction WITHOUT solving the problem for them.
Use ONLY the context below.

Context:
{context}

Question:
{question}

{SYLLABUS_RULE}"""


def build_summary_prompt(topic: str, context: str) -> str:
    return f"""Using ONLY the context below, write a concise revision summary of {topic}.
Cover: what it is, key syntax, one example, and 2 common mistakes.
Keep it under 200 words.

Context:
{context}

{SYLLABUS_RULE}"""