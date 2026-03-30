from vector_store import collection
from embedding_client import get_embedding

DISTANCE_THRESHOLD = 0.7


def retrieve_chunks(query: str, top_k: int = 5, topic: str = None) -> list:
    """
    Retrieve semantically relevant chunks.
    - Filters by topic when detected (keeps search within syllabus)
    - Applies distance threshold to drop irrelevant chunks
    """
    print(f"DEBUG — query: {query}, topic: {topic}, top_k: {top_k}")
    query_embedding = get_embedding(query)

    try:
        if topic:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where={"topic": topic},
                include=["documents", "metadatas", "distances"]
            )
        else:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
    except Exception as e:
        raise Exception(f"ChromaDB query failed: {str(e)}")

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    retrieved_data = []
    for doc, meta, distance in zip(documents, metadatas, distances):
        if distance <= DISTANCE_THRESHOLD:
            retrieved_data.append({
                "content": doc,
                "topic": meta["topic"],
                "section_title": meta.get("section_title", meta["topic"]),
                "distance": distance
            })

    return retrieved_data


def calculate_confidence(retrieved_chunks: list) -> float:
    if not retrieved_chunks:
        return 0.0
    avg_distance = sum(c["distance"] for c in retrieved_chunks) / len(retrieved_chunks)
    confidence = max(0.0, 1.0 - avg_distance)
    return round(confidence, 2)