def classify_query_type(question: str):
    q = question.lower()

    if "define" in q or "1-2 lines" in q or "short" in q:
        return "short"

    if "fix" in q or "error" in q or "debug" in q:
        return "debug"

    return "full"


def build_prompt(query_type: str, question: str, context: str):

    if query_type == "short":
        return f"""
Answer the question in 1-2 lines only.
Use the provided context strictly.

Context:
{context}

Question:
{question}
"""

    elif query_type == "debug":
        return f"""
You are debugging Python code.
Provide clear fix and explanation.

Context:
{context}

Question:
{question}
"""

    else:
        return f"""
Provide structured explanation:
1. Clear Explanation
2. Code Example
3. Common Mistakes
4. Edge Cases
5. Short Practice Question

Use only provided context.

Context:
{context}

Question:
{question}
"""
    

def determine_top_k(question: str):
    q = question.lower()

    if "define" in q or "short" in q:
        return 2

    if "compare" in q or "difference" in q:
        return 4

    if "debug" in q or "fix" in q:
        return 5

    return 3