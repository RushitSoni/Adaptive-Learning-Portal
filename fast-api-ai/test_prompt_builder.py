# def build_test_prompt(
#     topic: str,
#     difficulty: str,
#     context: str,
#     mcq_count: int,
#     code_io_count: int,
#     coding_count: int
# ):
#     return f"""
# You are generating a structured programming test.
# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.
# Topic: {topic}
# Difficulty: {difficulty}

# Use the following reference material:
# {context}

# Generate:

# 1) {mcq_count} MCQ questions
# Each must include:
# - question
# - 4 options
# - correct_answer
# - explanation

# 2) {code_io_count} Code snippet I/O questions
# Each must include:
# - code
# - input
# - expected_output
# - explanation

# 3) {coding_count} Coding challenges
# Each must include:
# - title
# - description
# - function_name
# - starter_code(only function name and its parameters)
# - test_cases (array of input + expected)

# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
# Return ONLY valid JSON in this format:

# {{
#   "mcq": [...],
#   "code_io": [...],
#   "coding": [...]
# }}

# Do NOT include markdown.
# Do NOT include commentary.

# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
# RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.


# """


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
        "easy": "Use basic definitions, simple syntax, and straightforward examples.",
        "medium": "Include edge cases, moderate logic, and multi-step reasoning.",
        "hard": "Include complex scenarios, tricky edge cases, and advanced usage."
    }.get(difficulty, "Use moderate difficulty.")

    return f"""You are a Python quiz generator. Generate a quiz using ONLY the context below.
Difficulty: {difficulty.upper()} — {difficulty_guide}

Context:
{context}

Generate exactly:
- {mcq_count} MCQ questions (multiple choice, 4 options, one correct)
- {code_io_count} Code Output questions (show code, ask what output is)
- {coding_count} Coding questions (ask student to write a function, include test cases)

Return ONLY valid JSON in this exact format, no extra text:
{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "mcq": [
    {{
      "id": 1,
      "question": "...",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "correct_answer": "A",
      "explanation": "..."
    }}
  ],
  "code_io": [
    {{
      "id": 1,
      "code": "...",
      "question": "What is the output of this code?",
      "expected_output": "..."
    }}
  ],
  "coding": [
    {{
      "id": 1,
      "question": "...",
      "function_name": "...",
      "test_cases": [
        {{"input": "...", "expected": "..."}}
      ]
    }}
  ]
}}

STRICT RULE: Only use information from the Context above. Do not use outside knowledge.
"""