# import requests
# from config import HF_API_KEY, HF_EMBEDDING_MODEL

# HF_URL = f"https://router.huggingface.co/hf-inference/models/{HF_EMBEDDING_MODEL}"

# headers = {
#     "Authorization": f"Bearer {HF_API_KEY}",
#     "Content-Type": "application/json"
# }

# def get_embedding(text):
#     response = requests.post(
#         HF_URL,
#         headers=headers,
#         json={
#             "inputs": text
#         }
#     )

#     if response.status_code != 200:
#         raise Exception(f"HuggingFace API Error: {response.text}")

#     data = response.json()

#     # HF returns [[embedding]]
#     if isinstance(data, list) and isinstance(data[0], list):
#         return data[0]

#     return data


# def get_embeddings(texts):
#     """
#     Batch version of get_embedding — sends a list of strings in one HF API
#     call and returns a list of embedding vectors (same order as input).
#     Used by topic_detector to avoid one HTTP round-trip per description.
#     """
#     response = requests.post(
#         HF_URL,
#         headers=headers,
#         json={
#             "inputs": texts
#         }
#     )

#     if response.status_code != 200:
#         raise Exception(f"HuggingFace API Error: {response.text}")

#     data = response.json()

#     # HF returns a list of embeddings, one per input string
#     return data



import logging
from fastembed import TextEmbedding
from config import HF_EMBEDDING_MODEL

logger = logging.getLogger(__name__)

# Used if fastembed doesn't support the model named in config.py
FALLBACK_MODEL = "BAAI/bge-small-en-v1.5"  # 384-dim, small, fast on CPU

_model = None


def _get_model():
    """Load the local embedding model once and reuse it."""
    global _model
    if _model is None:
        try:
            _model = TextEmbedding(model_name=HF_EMBEDDING_MODEL)
            logger.info("Loaded embedding model: %s", HF_EMBEDDING_MODEL)
        except Exception as e:
            logger.warning(
                "fastembed doesn't support %s (%s). Falling back to %s. "
                "Vector dimensions may differ from previously stored embeddings.",
                HF_EMBEDDING_MODEL, e, FALLBACK_MODEL,
            )
            _model = TextEmbedding(model_name=FALLBACK_MODEL)
    return _model


def get_embedding(text):
    """Embed one string -> list[float]."""
    return next(iter(_get_model().embed([text]))).tolist()


def get_embeddings(texts):
    """Embed many strings -> list of list[float], same order as input."""
    return [vec.tolist() for vec in _get_model().embed(list(texts))]