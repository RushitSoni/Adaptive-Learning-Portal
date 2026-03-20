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
calculate_confidence -> based on distance

rag_pipeline -
generate_answer -> llm response based on prompt

execute_submission -
run_test_case 
execute_submission -> all test_cases

test_prompt_builder-
build_test_prompt