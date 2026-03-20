from retriever import retrieve_chunks, calculate_confidence

query = "Why does recursion cause stack overflow?"

results = retrieve_chunks(query)

print("\nRetrieved Chunks:\n")

for r in results:
    print("Topic:", r["topic"])
    print("Distance:", r["distance"])
    print("Content Preview:", r["content"][:150])
    print("-" * 50)

confidence = calculate_confidence(results)

print("\nConfidence:", confidence)