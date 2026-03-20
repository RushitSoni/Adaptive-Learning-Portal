from document_loader import load_documents
from chunker import create_chunks

docs = load_documents()
chunks = create_chunks(docs)

print("Total documents:", len(docs))
print("Total chunks:", len(chunks))
print("\nSample chunk:\n")
print(chunks[0])