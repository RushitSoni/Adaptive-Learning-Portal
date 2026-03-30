from groq_client import call_groq
import json


def rerank_chunks(query: str, chunks: list, top_n: int = 3) -> list:
    """
    Re-rank retrieved chunks by relevance to the query using LLM scoring.
    More accurate than raw cosine distance alone.
    Falls back to original order if reranking fails.

    Each chunk gets a relevance score 1-10.
    Returns top_n chunks sorted by score descending.
    """
    if not chunks:
        return chunks

    if len(chunks) <= 1:
        return chunks

    # Build scoring prompt
    chunks_text = ""
    for i, chunk in enumerate(chunks):
        preview = chunk["content"][:300].replace('\n', ' ')
        chunks_text += f"[{i}] {preview}\n\n"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a relevance scoring system. "
                "Score each chunk 1-10 for how relevant it is to the query. "
                "Return ONLY a JSON array of scores in order, e.g. [8, 3, 7, 5]. "
                "No explanation."
            )
        },
        {
            "role": "user",
            "content": (
                f"Query: {query}\n\n"
                f"Chunks to score:\n{chunks_text}"
            )
        }
    ]

    try:
        response = call_groq(messages, max_tokens=80)
        raw = response["content"].strip()

        # Parse JSON array
        scores = json.loads(raw)

        if not isinstance(scores, list) or len(scores) != len(chunks):
            return chunks[:top_n]

        # Attach scores and sort
        scored = list(zip(scores, chunks))
        scored.sort(key=lambda x: x[0], reverse=True)

        return [chunk for _, chunk in scored[:top_n]]

    except Exception:
        # Graceful fallback: return original top_n
        return chunks[:top_n]