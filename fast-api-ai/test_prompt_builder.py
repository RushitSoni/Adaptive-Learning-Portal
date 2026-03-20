def build_test_prompt(
    topic: str,
    difficulty: str,
    context: str,
    mcq_count: int,
    code_io_count: int,
    coding_count: int
):
    return f"""
You are generating a structured programming test.
RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.
Topic: {topic}
Difficulty: {difficulty}

Use the following reference material:
{context}

Generate:

1) {mcq_count} MCQ questions
Each must include:
- question
- 4 options
- correct_answer
- explanation

2) {code_io_count} Code snippet I/O questions
Each must include:
- code
- input
- expected_output
- explanation

3) {coding_count} Coding challenges
Each must include:
- title
- description
- function_name
- starter_code(only function name and its parameters)
- test_cases (array of input + expected)

RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
Return ONLY valid JSON in this format:

{{
  "mcq": [...],
  "code_io": [...],
  "coding": [...]
}}

Do NOT include markdown.
Do NOT include commentary.

RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.
RETURN ONLY VALID JSON.ONLY JSON AS AN ANSWER. NO ANY EXTRA STUFFS.AS DESCRIBED ABOVE.


"""