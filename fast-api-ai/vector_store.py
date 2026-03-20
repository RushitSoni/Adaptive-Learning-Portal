import chromadb
from embedding_client import get_embedding

# Use PersistentClient (NEW way)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

collection = chroma_client.get_or_create_collection(
    name="python_topics"
)

def index_chunks(chunks):
    for i, chunk in enumerate(chunks):
        embedding = get_embedding(chunk["content"])

        collection.add(
            ids=[f"id_{i}"],
            documents=[chunk["content"]],
            metadatas=[{"topic": chunk["topic"]}],
            embeddings=[embedding]
        )

