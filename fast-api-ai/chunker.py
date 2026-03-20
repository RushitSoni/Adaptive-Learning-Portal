def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap

    return chunks


def create_chunks(documents):
    all_chunks = []

    for doc in documents:
        topic = doc["topic"]
        content = doc["content"]

        chunks = chunk_text(content)

        for chunk in chunks:
            all_chunks.append({
                "topic": topic,
                "content": chunk
            })

    return all_chunks