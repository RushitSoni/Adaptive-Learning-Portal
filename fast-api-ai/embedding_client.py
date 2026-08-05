import requests
from config import HF_API_KEY, HF_EMBEDDING_MODEL

HF_URL = f"https://router.huggingface.co/hf-inference/models/{HF_EMBEDDING_MODEL}"

headers = {
    "Authorization": f"Bearer {HF_API_KEY}",
    "Content-Type": "application/json"
}

def get_embedding(text):
    response = requests.post(
        HF_URL,
        headers=headers,
        json={
            "inputs": text
        }
    )

    if response.status_code != 200:
        raise Exception(f"HuggingFace API Error: {response.text}")

    data = response.json()

    # HF returns [[embedding]]
    if isinstance(data, list) and isinstance(data[0], list):
        return data[0]

    return data


def get_embeddings(texts):
    """
    Batch version of get_embedding — sends a list of strings in one HF API
    call and returns a list of embedding vectors (same order as input).
    Used by topic_detector to avoid one HTTP round-trip per description.
    """
    response = requests.post(
        HF_URL,
        headers=headers,
        json={
            "inputs": texts
        }
    )

    if response.status_code != 200:
        raise Exception(f"HuggingFace API Error: {response.text}")

    data = response.json()

    # HF returns a list of embeddings, one per input string
    return data