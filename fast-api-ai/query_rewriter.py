from groq_client import call_groq


def rewrite_query(question: str) -> str:
    """
    Rewrite a student's casual question into a retrieval-optimized query.
    E.g. "i keep getting weird output from my function" 
      -> "Python function return value bug debugging"
    Falls back to original question if rewriting fails.
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are a search query optimizer for a Python learning system. "
                "Rewrite the student's question into a short, precise search query "
                "(5-10 words) that will best match technical Python documentation. "
                "Output ONLY the rewritten query. No explanation, no punctuation at end."
            )
        },
        {
            "role": "user",
            "content": f"Student question: {question}"
        }
    ]

    try:
        response = call_groq(messages, max_tokens=50)
        rewritten = response["content"].strip()
        # Safety: if response is too long or empty, fall back
        if not rewritten or len(rewritten) > 120:
            return question
        return rewritten
    except Exception:
        return question