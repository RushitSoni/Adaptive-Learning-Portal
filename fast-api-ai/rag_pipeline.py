from groq_client import call_groq


def generate_answer(prompt: str):
    """
    Takes a fully constructed prompt (already includes context)
    and returns (answer, usage_metadata)
    """

    # We now assume:
    # - Prompt is already built in main.py
    # - Retrieval & confidence handled in main.py

    messages = [
        {
            "role": "system",
            "content": "You are a precise Python tutor. Answer only using provided context."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    try:
        llm_response = call_groq(messages)

        answer = llm_response["content"]
        usage = llm_response["usage"]

        return answer, usage

    except Exception as e:
        raise Exception(f"Groq API Error: {str(e)}")