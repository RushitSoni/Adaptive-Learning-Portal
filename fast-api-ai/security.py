import re

INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"ignore all instructions",
    r"reveal system prompt",
    r"disclose hidden instructions",
    r"bypass safety",
    r"act as system",
    r"forget everything",
    r"new instructions",
    r"you are now",
    r"pretend you are",
    r"jailbreak",
    r"dan mode",
    r"do anything now",
    r"override instructions",
    r"disregard your",
    r"ignore your",
]


def detect_prompt_injection(question: str):
    question_lower = question.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, question_lower):
            raise ValueError("Potential prompt injection detected. Please ask a Python question.")