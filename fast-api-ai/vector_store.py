import os
import hashlib
import chromadb
from dotenv import load_dotenv
from embedding_client import get_embedding

# Load variables from your .env file into os.environ
load_dotenv()

CHROMA_API_KEY = os.environ["CHROMA_API_KEY"]
CHROMA_TENANT = os.environ["CHROMA_TENANT"]
CHROMA_DATABASE = os.environ["CHROMA_DATABASE"]

# chroma_client = chromadb.PersistentClient(path="./chroma_db")  # old local version

client = chromadb.CloudClient(
    api_key=CHROMA_API_KEY,
    tenant=CHROMA_TENANT,
    database=CHROMA_DATABASE,
)

collection = client.get_or_create_collection(name="python_topics")

BATCH_SIZE = 50


def _make_chunk_id(content: str, topic: str) -> str:
    """Use MD5 hash of content+topic so re-indexing is idempotent."""
    raw = f"{topic}::{content}"
    return hashlib.md5(raw.encode()).hexdigest()


def index_chunks(chunks: list):
    """
    Index chunks in batches.
    Uses content-hash IDs so re-running index_builder never creates duplicates.
    Stores enriched metadata: topic, section_title, has_code.
    """
    ids, documents, metadatas, embeddings = [], [], [], []

    for chunk in chunks:
        chunk_id = _make_chunk_id(chunk["content"], chunk["topic"])
        embedding = get_embedding(chunk["content"])

        ids.append(chunk_id)
        documents.append(chunk["content"])
        metadatas.append({
            "topic": chunk["topic"],
            "section_title": chunk.get("section_title", chunk["topic"]),
            "has_code": str(chunk.get("has_code", False)),
        })
        embeddings.append(embedding)

        # Flush batch
        if len(ids) >= BATCH_SIZE:
            _upsert_batch(ids, documents, metadatas, embeddings)
            ids, documents, metadatas, embeddings = [], [], [], []

    # Flush remaining
    if ids:
        _upsert_batch(ids, documents, metadatas, embeddings)


def _upsert_batch(ids, documents, metadatas, embeddings):
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )
    print(f"  Upserted batch of {len(ids)} chunks.")


def get_all_chunks_for_topic(topic: str) -> list:
    """Fetch ALL chunks for a topic — used by quiz generator for full coverage."""
    results = collection.get(
        where={"topic": topic},
        include=["documents", "metadatas"],
    )
    chunks = []
    for doc, meta in zip(results["documents"], results["metadatas"]):
        chunks.append({
            "content": doc,
            "topic": meta["topic"],
            "section_title": meta.get("section_title", topic),
            "distance": 0.0,
        })
    return chunks