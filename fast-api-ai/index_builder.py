from document_loader import load_documents
from chunker import create_chunks
from vector_store import index_chunks

docs = load_documents()
chunks = create_chunks(docs)

print("Indexing started...")
index_chunks(chunks)
print("Indexing completed.")