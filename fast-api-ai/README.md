validators  -  validate_question -> len 5 to 500
security - detect_prompt_injection -> risky word in prompt

prompt_router  - 
classify_query_type -> short,debug,else
build_prompt
determine_top_k -> based on prompts requiremnet

embedding_client - 
get_embedding -> using HF

retriver - 
retrieve_chunks -> retrieve data
calculate_confidence -> based on distance (avg over all chunks retrieved)

rag_pipeline -
generate_answer -> llm response based on prompt
faithfullness check -> Does the Answer contain ONLY information from the Context?

execute_submission -
run_test_case 
execute_submission -> all test_cases

test_prompt_builder-
build_test_prompt

vector_store-
Convert text chunks → embeddings → store them in ChromaDB for retrieval later

student_tracker.py
deal with mongoDB, all type of operation on student data

reranker.py
Uses an LLM to re-evaluate and pick the most relevant chunks after vector search
extra api call, but better results


query_rewriter.py

