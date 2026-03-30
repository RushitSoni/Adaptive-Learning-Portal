import time
import requests
from config import GROQ_API_KEY, GROQ_MODEL

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def call_groq(messages: list, max_tokens: int = 1024) -> dict:
    """
    Call Groq API with exponential backoff retry on 429/500 errors.
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": max_tokens
    }

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)

            if response.status_code == 200:
                data = response.json()
                return {
                    "content": data["choices"][0]["message"]["content"],
                    "usage": data.get("usage", {})
                }

            if response.status_code in (429, 500, 503):
                wait = RETRY_DELAY * (2 ** attempt)
                print(f"Groq API {response.status_code}. Retrying in {wait}s... (attempt {attempt+1})")
                time.sleep(wait)
                last_error = f"Groq API Error {response.status_code}: {response.text}"
                continue

            raise Exception(f"Groq API Error {response.status_code}: {response.text}")

        except requests.exceptions.Timeout:
            last_error = "Groq API request timed out"
            time.sleep(RETRY_DELAY * (2 ** attempt))

    raise Exception(f"Groq API failed after {MAX_RETRIES} attempts. Last error: {last_error}")