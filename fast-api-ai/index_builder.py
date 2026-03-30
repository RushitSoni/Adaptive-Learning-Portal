from document_loader import load_documents
from chunker import create_chunks
from vector_store import index_chunks

print("Loading documents...")
docs = load_documents()
print(f"Loaded {len(docs)} documents.\n")

print("Creating chunks...")
chunks = create_chunks(docs)
print(f"Created {len(chunks)} chunks.\n")

print("Indexing into ChromaDB...")
index_chunks(chunks)
print(f"\nIndexing complete. {len(chunks)} chunks indexed.")