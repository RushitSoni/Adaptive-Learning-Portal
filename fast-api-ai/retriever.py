from vector_store import collection
from embedding_client import get_embedding

# DISTANCE_THRESHOLD = 0.5

def retrieve_chunks(query: str, top_k: int = 5, topic: str = None):

    query_embedding = get_embedding(query)

    # Topic-aware query
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


    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    retrieved_data = []

    for doc, meta, distance in zip(documents, metadatas, distances):
        # Apply threshold filtering
        #if distance <= DISTANCE_THRESHOLD:
            retrieved_data.append({
                "content": doc,
                "topic": meta["topic"],
                "distance": distance
            })

    return retrieved_data


    




def calculate_confidence(retrieved_chunks):
    if not retrieved_chunks:
        return 0.0

    avg_distance = sum(chunk["distance"] for chunk in retrieved_chunks) / len(retrieved_chunks)

    # Convert distance to confidence (simple heuristic)
    confidence = max(0, 1 - avg_distance)

    return round(confidence, 2)