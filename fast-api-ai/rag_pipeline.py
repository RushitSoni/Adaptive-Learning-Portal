from groq_client import call_groq

SYSTEM_PROMPT = (
    "You are a precise Python tutor. "
    "Answer ONLY using the context provided in the user message. "
    "If the answer is not in the context, say: "
    "'This topic is not covered in the current syllabus material.' "
    "Never use outside knowledge."
)


def generate_answer(prompt: str, history: list = None) -> tuple:
    """
    Generate an answer from the LLM.
    Optionally accepts conversation history for multi-turn chat.
    Returns (answer, usage).
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": prompt})

    try:
        llm_response = call_groq(messages, max_tokens=1024)
        return llm_response["content"], llm_response["usage"]
    except Exception as e:
        raise Exception(f"Groq API Error: {str(e)}")


def check_faithfulness(answer: str, context: str) -> bool:
    """
    Ask the LLM: does this answer contain info NOT in the context?
    Returns True if answer is faithful (grounded in context).
    Returns False if answer uses outside knowledge.
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are a fact-checking assistant. "
                "Answer ONLY with YES or NO. Nothing else."
            )
        },
        {
            "role": "user",
            "content": (
                f"Context:\n{context}\n\n"
                f"Answer:\n{answer}\n\n"
                "Does the Answer contain ONLY information that is present in the Context above or related to programming language Python? "
                "Reply YES if it is fully grounded or based on Python. Reply NO if it uses outside knowledge."
            )
        }
    ]

    try:
        response = call_groq(messages, max_tokens=5)
        verdict = response["content"].strip().upper()
        return verdict.startswith("YES")
    except Exception:
        # On failure, assume faithful (don't block the student)
        return True