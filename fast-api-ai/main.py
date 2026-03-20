from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from validators import validate_question
from security import detect_prompt_injection
from topic_detector import detect_topic
from prompt_router import classify_query_type, build_prompt, determine_top_k
from retriever import retrieve_chunks, calculate_confidence
from rag_pipeline import generate_answer  # you must modify this

from typing import List, Dict
from pydantic import BaseModel

from test_prompt_builder import build_test_prompt
import json

from typing import List
from pydantic import BaseModel

from code_executor import execute_submission
from fastapi import HTTPException
from pydantic import BaseModel
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Python RAG Tutor API",
    description="Topic-aware RAG-based Python doubt solving backend",
    version="1.0.0"
)



origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


################################################################################################


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    topics_used: list
    confidence: float
    sources: list
    usage: dict




class TestRequest(BaseModel):
    topic: str
    difficulty: str  # easy / medium / hard
    num_questions: int


class TestResponse(BaseModel):
    test: Dict
    topics_used: List[str]
    confidence: float
    usage: Dict

class MCQSubmission(BaseModel):
    question_id: int
    selected_answer: str
    correct_answer: str


class CodeIOSubmission(BaseModel):
    question_id: int
    user_output: str
    expected_output: str


class ObjectiveEvaluationRequest(BaseModel):
    mcq: List[MCQSubmission]
    code_io: List[CodeIOSubmission]

def evaluate_mcqs(mcqs: List[MCQSubmission]):
    score = 0
    details = []

    for q in mcqs:
        passed = q.selected_answer == q.correct_answer
        if passed:
            score += 1

        details.append({
            "question_id": q.question_id,
            "correct": passed
        })

    return score, details


def evaluate_code_io(code_ios: List[CodeIOSubmission]):
    score = 0
    details = []

    for q in code_ios:
        passed = str(q.user_output).strip() == str(q.expected_output).strip()
        if passed:
            score += 1

        details.append({
            "question_id": q.question_id,
            "correct": passed
        })

    return score, details

def split_question_types(total: int):
    mcq = total // 3
    code_io = total // 3
    coding = total - mcq - code_io
    return mcq, code_io, coding

######################################################################


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):

    try:
        # Input validation
        question = validate_question(req.question)

        #  Injection detection
        detect_prompt_injection(question)

        #  Dynamic top_k
        dynamic_top_k = determine_top_k(question)

        #  Topic detection
        topic = detect_topic(question)

        #  Retrieval
        retrieved_chunks = retrieve_chunks(
            query=question,
            top_k=dynamic_top_k,
            topic=topic
        )

        #  Confidence calculation
        confidence = calculate_confidence(retrieved_chunks)

        # Guardrail
        if confidence < 0.4:
            return {
                "answer": "Low confidence in retrieved knowledge. Please rephrase your question.",
                "topics_used": [],
                "confidence": confidence,
                "sources": [],
                "usage": {}
            }

        #  Build context
        context_text = "\n\n".join(
            chunk["content"] for chunk in retrieved_chunks
        )

        #  Query classification
        query_type = classify_query_type(question)

        #  Dynamic prompt building
        final_prompt = build_prompt(
            query_type=query_type,
            question=question,
            context=context_text
        )

        #  Generate answer from LLM
        answer, usage = generate_answer(final_prompt)

        return {
            "answer": answer,
            "topics_used": [chunk["topic"] for chunk in retrieved_chunks],
            "confidence": confidence,
            "sources": retrieved_chunks,
            "usage": usage
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/generate-test", response_model=TestResponse)
def generate_test(req: TestRequest):
    try:
        # Validation
        if req.difficulty not in ["easy", "medium", "hard"]:
            raise HTTPException(status_code=400, detail="Invalid difficulty")

        if req.num_questions < 3:
            raise HTTPException(status_code=400, detail="Minimum 3 questions required")

        # Topic detection
        topic = detect_topic(req.topic)

        # Retrieval
        retrieval = retrieve_chunks(
            query=req.topic,
            top_k=5,
            topic=topic
        )

        if not retrieval:
            raise HTTPException(status_code=400, detail="No relevant content found")

        # Extract content
        context_text = "\n\n".join(chunk["content"] for chunk in retrieval)

        # Use your existing confidence function
        confidence = calculate_confidence(retrieval)

        # Split types
        mcq_count, code_io_count, coding_count = split_question_types(req.num_questions)

        # Build prompt
        final_prompt = build_test_prompt(
            topic=topic,
            difficulty=req.difficulty,
            context=context_text,
            mcq_count=mcq_count,
            code_io_count=code_io_count,
            coding_count=coding_count
        )

        # LLM call
        answer, usage = generate_answer(final_prompt)

        # Parse JSON safely
        try:
            parsed_test = json.loads(answer)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="LLM returned invalid JSON")

        return {
            "test": parsed_test,
            "topics_used": [topic],
            "confidence": confidence,
            "usage": usage
        }

    except Exception as e:
        
        print("GENERATE TEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/evaluate-objective")

def evaluate_objective(req: ObjectiveEvaluationRequest):
    try:
        print(req.model_dump())
        mcq_score, mcq_details = evaluate_mcqs(req.mcq)
        code_score, code_details = evaluate_code_io(req.code_io)

        total_questions = len(req.mcq) + len(req.code_io)
        total_score = mcq_score + code_score

        percentage = round((total_score / total_questions) * 100, 2) if total_questions else 0

        return {
            "total_questions": total_questions,
            "score": total_score,
            "percentage": percentage,
            "mcq_details": mcq_details,
            "code_io_details": code_details
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    



class TestCase(BaseModel):
    input: str
    expected: str

class CodeSubmission(BaseModel):
    question_id: int
    function_name: str
    code: str
    test_cases: List[TestCase]

@app.post("/submit-code")
def submit_code(payload: CodeSubmission):
    result = execute_submission(
        user_code=payload.code,
        function_name=payload.function_name,
        test_cases=[tc.dict() for tc in payload.test_cases]
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result)

    percentage = round((result["passed"] / result["total"]) * 100, 2)

    return {
        "question_id": payload.question_id,
        "score_percentage": percentage,
        **result
    }