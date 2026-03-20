from rag_pipeline import run_rag

query = "Why does recursion sometimes cause stack overflow?"

result = run_rag(query)

print("\nANSWER:\n")
print(result["answer"])

print("\nTOPICS USED:", result["topics_used"])
print("CONFIDENCE:", result["confidence"])
print("USAGE:", result["usage"])