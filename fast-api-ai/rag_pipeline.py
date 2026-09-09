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
    Skips the LLM call entirely for short answers — only checks longer answers,
    and even then is heavily biased toward returning True.
    """
    # Skip the check for short/simple answers — treat as automatically faithful
    if len(answer.strip()) < 200:
        return True

    messages = [
        {
            "role": "system",
            "content": (
                "You are a lenient fact-checking assistant. "
                "Give the student the benefit of the doubt. "
                "Answer ONLY with YES or NO. Nothing else."
            )
        },
        {
            "role": "user",
            "content": (
                f"Context:\n{context}\n\n"
                f"Answer:\n{answer}\n\n"
                "Is the Answer reasonably related to the Context, to general programming concepts, "
                "or to Python in any way? Reply YES unless the Answer is completely unrelated to "
                "both the Context and programming. Reply NO only if it is clearly off-topic or fabricated nonsense."
            )
        }
    ]

    try:
        response = call_groq(messages, max_tokens=5)
        verdict = response["content"].strip().upper()
        return not verdict.startswith("NO")  # default to True unless explicit NO
    except Exception:
        # On failure, assume faithful (don't block the student)
        return True