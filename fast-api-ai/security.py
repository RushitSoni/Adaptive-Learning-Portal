import re

INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"reveal system prompt",
    r"disclose hidden instructions",
    r"bypass safety",
    r"act as system",
]

def detect_prompt_injection(question: str):
    question_lower = question.lower()

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, question_lower):
            raise ValueError("Potential prompt injection detected.")