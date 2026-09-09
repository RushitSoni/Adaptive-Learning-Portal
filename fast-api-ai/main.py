"""
main.py — Python RAG Tutor API v2.0
New in this version:
- MongoDB student tracking (POST /student, GET /student/{id}, GET /student/{id}/progress)
- Chat now accepts student_id and persists history to MongoDB
- Quiz result recording (POST /student/{id}/record-quiz)
- Adaptive difficulty suggestion (GET /student/{id}/suggest-difficulty/{topic})
"""
import json
import os
import re
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from validators import validate_question
from security import detect_prompt_injection
from topic_detector import detect_topic, is_on_syllabus, SYLLABUS_TOPICS
from prompt_router import (
    classify_query_type, build_prompt, determine_top_k,
    build_hint_prompt, build_summary_prompt
)
from retriever import retrieve_chunks, calculate_confidence
from vector_store import get_all_chunks_for_topic
from rag_pipeline import generate_answer, check_faithfulness
from query_rewriter import rewrite_query
from reranker import rerank_chunks
from test_prompt_builder import build_test_prompt
from code_executor import execute_submission
from student_tracker import (
    create_student, get_student, get_or_create_student,
    record_quiz_result, update_chat_history, get_chat_history,
    suggest_next_difficulty, get_progress_summary
)
from bkt import (
    update_bkt,
    get_mastery,
    get_all_mastery,
    bulk_update_bkt_from_quiz
)
 
from rl_policy import (
    build_state,
    select_action,
    update_q,
    get_best_strategies,
    compute_reward
)
 
from rl_tracker import (
    start_session,
    log_doubt,
    close_session,
    get_last_action,
    get_session_summary
)



app = FastAPI(
    title="Python RAG Tutor API",
    description="Adaptive Python tutor with RAG + MongoDB student tracking",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["https://adaptive-learning-portal-frontend.onrender.com"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# ─── Pydantic Models ─────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    student_id: Optional[str] = None
    history: Optional[List[Dict]] = []
    difficulty: Optional[str] = "medium"

class ChatResponse(BaseModel):
    answer: str
    topics_used: list
    confidence: float
    sources: list
    usage: dict
    rewritten_query: str
    faithful: bool
    strategy_used: Optional[str] = None       
    rl_metadata: Optional[dict] = None

class HintRequest(BaseModel):
    question: str

class SummaryRequest(BaseModel):
    topic: str

class TestRequest(BaseModel):
    topic: str
    difficulty: str
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

class CodingSubmission(BaseModel):
    question_id: int
    score_percentage: float   # 0-100, from /submit-code result

class ObjectiveEvaluationRequest(BaseModel):
    mcq: List[MCQSubmission]
    code_io: List[CodeIOSubmission]
    coding: Optional[List[CodingSubmission]] = []

class TestCase(BaseModel):
    input: str
    expected: str

class CodeSubmission(BaseModel):
    question_id: int
    function_name: str
    code: str
    test_cases: List[TestCase]

class CreateStudentRequest(BaseModel):
    name: str

class RecordQuizRequest(BaseModel):
    topic: str
    score: float
    difficulty: str

class BKTUpdateRequest(BaseModel):
    topic: str
    is_correct: bool
 
class StartSessionRequest(BaseModel):
    topic: str
    quiz1_score: float
    difficulty: str
 
class BulkBKTRequest(BaseModel):
    topic: str
    mcq_results: List[bool]       # one bool per MCQ (correct/wrong)
    code_io_results: List[bool]   # one bool per code_io question
    coding_scores: List[float]    # one float 0-100 per coding question
 


# ─── Helpers ─────────────────────────────────────────────────────────────────

def resolve_topic(raw: str) -> str | None:
    cleaned = raw.lower().strip()
    if cleaned in SYLLABUS_TOPICS:
        return cleaned
    return detect_topic(raw)

def split_question_types(total: int):
    if total < 3:
        total = 3
    mcq = max(1, total // 3)
    code_io = max(1, total // 3)
    coding = max(1, total - mcq - code_io)
    return mcq, code_io, coding

# Weightage per question type
MCQ_WEIGHT    = 1
CODE_IO_WEIGHT = 2
CODING_WEIGHT  = 3

def evaluate_mcqs(mcqs: List[MCQSubmission]):
    earned, details = 0, []
    for q in mcqs:
        passed = q.selected_answer.strip().upper() == q.correct_answer.strip().upper()
        points = MCQ_WEIGHT if passed else 0
        earned += points
        details.append({
            "question_id": q.question_id,
            "correct": passed,
            "points_earned": points,
            "points_possible": MCQ_WEIGHT
        })
    return earned, details

def evaluate_code_io(code_ios: List[CodeIOSubmission]):
    earned, details = 0, []
    for q in code_ios:
        passed = str(q.user_output).strip() == str(q.expected_output).strip()
        points = CODE_IO_WEIGHT if passed else 0
        earned += points
        details.append({
            "question_id": q.question_id,
            "correct": passed,
            "points_earned": points,
            "points_possible": CODE_IO_WEIGHT
        })
    return earned, details

def evaluate_coding(codings: List[CodingSubmission]):
    earned, details = 0, []
    for q in codings:
        # score_percentage from /submit-code (0-100), convert to weighted points
        points = round((q.score_percentage / 100) * CODING_WEIGHT, 2)
        earned += points
        details.append({
            "question_id": q.question_id,
            "score_percentage": q.score_percentage,
            "points_earned": points,
            "points_possible": CODING_WEIGHT
        })
    return earned, details


# ─── Student Endpoints ────────────────────────────────────────────────────────

@app.post("/student")
def create_new_student(req: CreateStudentRequest):
    """Create a new student profile. Returns student_id to store in frontend."""
    student = create_student(req.name)
    return {"student_id": student["student_id"], "name": student["name"]}


@app.get("/student/{student_id}")
def get_student_profile(student_id: str):
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.pop("chat_history", None)  # don't send full history in profile
    return student


@app.get("/student/{student_id}/progress")
def get_progress(student_id: str):
    summary = get_progress_summary(student_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Student not found")
    return summary


@app.post("/student/{student_id}/record-quiz")
def record_quiz(student_id: str, req: RecordQuizRequest): # RecordQuizRequest
    from student_tracker import get_student, record_quiz_result, suggest_next_difficulty
 
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
 
    # 1. Record in student_tracker (existing behaviour)
    record_quiz_result(student_id, req.topic, req.score, req.difficulty)
 
    # 2. Close RL session — triggers Q-table updates with recency weights
    rl_update = close_session(
        student_id  = student_id,
        topic       = req.topic,
        quiz2_score = req.score
    )
 
    # 3. Start fresh session for next quiz cycle
    start_session(
        student_id  = student_id,
        topic       = req.topic,
        quiz1_score = req.score,
        difficulty  = req.difficulty
    )
 
    suggested = suggest_next_difficulty(student_id, req.topic)
 
    return {
        "recorded":                  True,
        "suggested_next_difficulty": suggested,
        "rl_session_update":         rl_update
    }


@app.get("/student/{student_id}/suggest-difficulty/{topic}")
def suggest_difficulty(student_id: str, topic: str):
    """Get adaptive difficulty suggestion for a topic based on score history."""
    resolved = resolve_topic(topic)
    if not resolved:
        raise HTTPException(status_code=400, detail="Topic not recognised")
    suggestion = suggest_next_difficulty(student_id, resolved)
    return {"topic": resolved, "suggested_difficulty": suggestion}


# ─── Core RAG Endpoints ───────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    try:
        from vector_store import collection
        all_meta = collection.get(include=["metadatas"])["metadatas"]
        topic_counts = {}
        for m in all_meta:
            t = m.get("topic", "unknown")
            topic_counts[t] = topic_counts.get(t, 0) + 1

        empty_topics = [t for t in SYLLABUS_TOPICS if topic_counts.get(t, 0) == 0]
        status = "degraded" if empty_topics else "ok"

        return {
            "status": status,
            "total_chunks": len(all_meta),
            "chunks_per_topic": topic_counts,
            "syllabus_topics": SYLLABUS_TOPICS,
            "warning": f"Not indexed: {empty_topics}" if empty_topics else None
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


# @app.get("/syllabus")
# def get_syllabus():
#     result = []
#     data_folder = "data"
#     for filename in sorted(os.listdir(data_folder)):
#         if not filename.endswith(".md"):
#             continue
#         topic = filename.replace(".md", "")
#         filepath = os.path.join(data_folder, filename)
#         try:
#             with open(filepath, "r", encoding="utf-8") as f:
#                 content = f.read()
#             sections = re.findall(r'^## (.+)', content, re.MULTILINE)
#             result.append({"topic": topic, "sections": sections})
#         except Exception:
#             result.append({"topic": topic, "sections": []})
#     return {"topics": result}

TOPIC_ORDER = [
    "variables",
    "strings",
    "lists",
    "dictionaries",
    "functions",
    "loops",
    "exceptions",
    "modules",
    "oop",
    "recursion",
]


@app.get("/syllabus")
def get_syllabus():
    result = []
    data_folder = "data"
 
    # Build a lookup of all available .md files first
    available = {
        f.replace(".md", ""): f
        for f in os.listdir(data_folder)
        if f.endswith(".md")
    }
 
    # Emit topics in the defined pedagogical order; skip any that aren't on disk
    ordered = [t for t in TOPIC_ORDER if t in available]
    # Append any extra topics not in TOPIC_ORDER at the end (future-proof)
    extras = [t for t in sorted(available) if t not in TOPIC_ORDER]
    for topic in ordered + extras:
        filepath = os.path.join(data_folder, available[topic])
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            sections = re.findall(r'^## (.+)', content, re.MULTILINE)
            result.append({"topic": topic, "sections": sections})
        except Exception:
            result.append({"topic": topic, "sections": []})
 
    return {"topics": result}



@app.post("/chat", response_model=ChatResponse)
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        from validators import validate_question
        from security import detect_prompt_injection
        from topic_detector import detect_topic, is_on_syllabus, SYLLABUS_TOPICS
        from prompt_router import (
            classify_query_type,
            build_prompt, build_prompt_with_strategy, determine_top_k
        )
        from rl_policy import classify_query_type_for_rl
        from retriever import retrieve_chunks, calculate_confidence
        from reranker import rerank_chunks
        from rag_pipeline import generate_answer, check_faithfulness
        from query_rewriter import rewrite_query
        from student_tracker import update_chat_history, get_chat_history

        question = validate_question(req.question)
        detect_prompt_injection(question)

        # ── Step 1: Load history FIRST (needed for context-aware syllabus check) ──
        history = []
        if req.history:
            history = req.history
        elif req.student_id:
            history = get_chat_history(req.student_id)

        # ── Step 2: Syllabus gate — context-aware ────────────────────────────────
        # If question itself is off-syllabus (e.g. "give code for it"),
        # check history before rejecting — it may have a valid topic context.
        if not is_on_syllabus(question):
            topic_from_history = None
            if history:
                for msg in reversed(history):
                    past_topic = detect_topic(msg.get("content", ""))
                    if past_topic:
                        topic_from_history = past_topic
                        break

            # Truly off-topic — no context in history either → reject
            if not topic_from_history:
                return {
                    "answer": f"This question doesn't appear to be about Python. "
                              f"Covered topics: {', '.join(SYLLABUS_TOPICS)}.",
                    "topics_used": [], "confidence": 0.0,
                    "sources": [], "usage": {}, "rewritten_query": question,
                    "faithful": True, "strategy_used": None, "rl_metadata": None
                }
            # else: topic found in history → fall through and answer normally

        # ── Step 3: Query rewriting + topic detection ────────────────────────────
        rewritten     = rewrite_query(question)
        topic         = detect_topic(question)
        dynamic_top_k = determine_top_k(question)

        # If topic still missing (e.g. "give code for it"), inherit from history
        if not topic and history:
            for msg in reversed(history):
                past_topic = detect_topic(msg.get("content", ""))
                if past_topic:
                    topic = past_topic
                    break

        # ── Step 4: Retrieve + rerank chunks ────────────────────────────────────
        retrieved_chunks = retrieve_chunks(query=rewritten, top_k=dynamic_top_k + 2, topic=topic)

        if len(retrieved_chunks) > 2:
            retrieved_chunks = rerank_chunks(rewritten, retrieved_chunks, top_n=dynamic_top_k)

        confidence = calculate_confidence(retrieved_chunks)
        if confidence < 0.4:
            return {
                "answer": "I couldn't find relevant information in the syllabus. "
                          "Please rephrase or check /syllabus for covered topics.",
                "topics_used": [], "confidence": confidence,
                "sources": [], "usage": {}, "rewritten_query": rewritten,
                "faithful": True, "strategy_used": None, "rl_metadata": None
            }

        context_text = "\n\n".join(c["content"] for c in retrieved_chunks)

        # ── Step 5: RL Strategy Selection (only when student_id present) ─────────
        strategy_used = None
        rl_metadata   = None

        if req.student_id and topic:
            difficulty = req.difficulty if hasattr(req, 'difficulty') and req.difficulty else "medium"

            bkt_state   = get_mastery(req.student_id, topic)
            perf_band   = bkt_state["perf_band"]
            last_action = get_last_action(req.student_id, topic)

            rl_query_type = classify_query_type_for_rl(question)

            state = build_state(
                topic       = topic,
                difficulty  = difficulty,
                query_type  = rl_query_type,
                perf_band   = perf_band,
                last_action = last_action
            )

            rl_result     = select_action(
                student_id  = req.student_id,
                state       = state,
                query_type  = rl_query_type,
                perf_band   = perf_band
            )
            strategy_used = rl_result["action"]

            final_prompt = build_prompt_with_strategy(question, context_text, strategy_used)

            rl_metadata = {
                "state":      state,
                "strategy":   strategy_used,
                "epsilon":    rl_result["epsilon"],
                "explored":   rl_result["explored"],
                "cold_start": rl_result["cold_start"],
                "perf_band":  perf_band,
                "p_mastery":  bkt_state["p_mastery"],
            }

            log_doubt(req.student_id, topic, state, strategy_used)

        else:
            # Anonymous user — use legacy prompt routing
            query_type   = classify_query_type(question)
            final_prompt = build_prompt(query_type, question, context_text)

        # ── Step 6: Generate answer ──────────────────────────────────────────────
        answer, usage = generate_answer(final_prompt, history=history)

        faithful = check_faithfulness(answer, context_text)
        if not faithful:
            answer = "I can only answer based on the syllabus material. Please rephrase."

        # ── Step 7: Persist to MongoDB ───────────────────────────────────────────
        if req.student_id:
            update_chat_history(req.student_id, "user", question)
            update_chat_history(req.student_id, "assistant", answer)

        return {
            "answer":          answer,
            "topics_used":     list({c["topic"] for c in retrieved_chunks}),
            "confidence":      confidence,
            "sources":         retrieved_chunks,
            "usage":           usage,
            "rewritten_query": rewritten,
            "faithful":        faithful,
            "strategy_used":   strategy_used,
            "rl_metadata":     rl_metadata,
        }

    except ValueError as e:
        raise Exception(f"400: {e}")
    except Exception as e:
        raise Exception(f"500: {e}")
 

@app.post("/hint")
def hint(req: HintRequest):
    try:
        question = validate_question(req.question)
        detect_prompt_injection(question)
        topic = detect_topic(question)
        retrieved_chunks = retrieve_chunks(query=question, top_k=2, topic=topic)
        if not retrieved_chunks:
            raise HTTPException(status_code=404, detail="No syllabus content found.")
        context_text = "\n\n".join(c["content"] for c in retrieved_chunks)
        prompt = build_hint_prompt(question, context_text)
        hint_text, usage = generate_answer(prompt)
        return {"hint": hint_text, "usage": usage}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarise-topic")
def summarise_topic(req: SummaryRequest):
    try:
        topic = resolve_topic(req.topic)
        if not topic:
            raise HTTPException(status_code=400,
                detail=f"Topic not recognised. Available: {', '.join(SYLLABUS_TOPICS)}")
        all_chunks = get_all_chunks_for_topic(topic)
        if not all_chunks:
            raise HTTPException(status_code=404, detail="No content indexed for this topic.")
        context_text = "\n\n".join(c["content"] for c in all_chunks)
        prompt = build_summary_prompt(topic, context_text)
        summary, usage = generate_answer(prompt)
        return {"topic": topic, "summary": summary, "usage": usage}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-test", response_model=TestResponse)
def generate_test(req: TestRequest):
    try:
        if req.difficulty not in ["easy", "medium", "hard"]:
            raise HTTPException(status_code=400, detail="difficulty must be easy, medium, or hard")
        if req.num_questions < 3:
            raise HTTPException(status_code=400, detail="Minimum 3 questions required")

        topic = resolve_topic(req.topic)
        if not topic:
            raise HTTPException(status_code=400,
                detail=f"Topic not recognised. Available: {', '.join(SYLLABUS_TOPICS)}")

        all_chunks = get_all_chunks_for_topic(topic)
        if not all_chunks:
            raise HTTPException(status_code=400, detail="No content indexed for this topic.")

        context_text = "\n\n".join(c["content"] for c in all_chunks)
        confidence = calculate_confidence(
            retrieve_chunks(query=req.topic, top_k=3, topic=topic)
        )

        mcq_count, code_io_count, coding_count = split_question_types(req.num_questions)
        final_prompt = build_test_prompt(
            topic=topic, difficulty=req.difficulty, context=context_text,
            mcq_count=mcq_count, code_io_count=code_io_count, coding_count=coding_count
        )

        answer, usage = generate_answer(final_prompt)

        clean = answer.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip()

        try:
            parsed_test = json.loads(clean)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="LLM returned invalid JSON for test.")

        return {"test": parsed_test, "topics_used": [topic], "confidence": confidence, "usage": usage}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate-objective")
def evaluate_objective(req: ObjectiveEvaluationRequest):
    try:
        mcq_earned,    mcq_details    = evaluate_mcqs(req.mcq)
        code_io_earned, code_io_details = evaluate_code_io(req.code_io)
        coding_earned,  coding_details  = evaluate_coding(req.coding or [])

        # Total points possible
        mcq_possible    = len(req.mcq)     * MCQ_WEIGHT
        code_io_possible = len(req.code_io) * CODE_IO_WEIGHT
        coding_possible  = len(req.coding or []) * CODING_WEIGHT
        total_possible   = mcq_possible + code_io_possible + coding_possible

        if total_possible == 0:
            raise HTTPException(status_code=400, detail="No questions submitted.")

        total_earned  = mcq_earned + code_io_earned + coding_earned
        percentage    = round((total_earned / total_possible) * 100, 2)

        return {
            "total_questions": len(req.mcq) + len(req.code_io) + len(req.coding or []),
            "points_earned":   round(total_earned, 2),
            "points_possible": total_possible,
            "percentage":      percentage,
            "breakdown": {
                "mcq":     {"earned": mcq_earned,     "possible": mcq_possible,     "weight": MCQ_WEIGHT},
                "code_io": {"earned": code_io_earned, "possible": code_io_possible, "weight": CODE_IO_WEIGHT},
                "coding":  {"earned": round(coding_earned, 2), "possible": coding_possible, "weight": CODING_WEIGHT},
            },
            "mcq_details":     mcq_details,
            "code_io_details": code_io_details,
            "coding_details":  coding_details,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/submit-code")
def submit_code(payload: CodeSubmission):
    try:
        result = execute_submission(
            user_code=payload.code,
            function_name=payload.function_name,
            test_cases=[tc.dict() for tc in payload.test_cases]
        )
        if result["total"] == 0:
            raise HTTPException(status_code=400, detail="No test cases provided.")
        percentage = round((result["passed"] / result["total"]) * 100, 2)
        return {"question_id": payload.question_id, "score_percentage": percentage, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/syllabus/{topic}")
def get_topic_content(topic: str):
    filepath = f"data/{topic}.md"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Topic not found")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return {"topic": topic, "content": content}


#########################  RL- Base Endpoints ##############################

@app.post("/student/{student_id}/bkt-update")
def bkt_update(student_id: str, req: BKTUpdateRequest):
    from student_tracker import get_student
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
 
    result = update_bkt(student_id, req.topic, req.is_correct)
    return {
        "student_id": student_id,
        "topic":      req.topic,
        "p_mastery":  result["p_mastery"],
        "perf_band":  result["perf_band"],
        "n_observations": result["n_observations"]
    }
 
 
@app.post("/student/{student_id}/bkt-bulk-update")
def bkt_bulk_update(student_id: str, req: BulkBKTRequest):
    """
    Update BKT from full quiz results at once.
    More convenient than calling /bkt-update per question.
    Call this alongside /record-quiz.
    """
    from student_tracker import get_student
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
 
    result = bulk_update_bkt_from_quiz(
        student_id      = student_id,
        topic           = req.topic,
        mcq_results     = req.mcq_results,
        code_io_results = req.code_io_results,
        coding_scores   = req.coding_scores
    )
    return {
        "student_id": student_id,
        "topic":      req.topic,
        **result
    }
 
 
@app.get("/student/{student_id}/mastery")
def get_student_mastery(student_id: str):
    """Return BKT mastery state for all topics this student has touched."""
    from student_tracker import get_student
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
 
    mastery = get_all_mastery(student_id)
    return {
        "student_id": student_id,
        "mastery":    mastery
    }
 
 
@app.get("/student/{student_id}/mastery/{topic}")
def get_topic_mastery(student_id: str, topic: str):
    resolved = resolve_topic(topic)
    if not resolved:
        raise Exception("400: Topic not recognised")
    result = get_mastery(student_id, resolved)
    return {
        "student_id": student_id,
        "topic":      resolved,
        **result
    }
 
 
@app.post("/student/{student_id}/start-session")
def start_rl_session(student_id: str, req: StartSessionRequest):
    """
    Explicitly start a new RL session (Quiz1 → Quiz2 window).
    Call this when student STARTS a quiz (before they answer).
    This sets quiz1_score so the reward can be computed when Quiz2 arrives.
    """
    from student_tracker import get_student
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
 
    start_session(
        student_id  = student_id,
        topic       = req.topic,
        quiz1_score = req.quiz1_score,
        difficulty  = req.difficulty
    )
    return {"status": "session_started", "topic": req.topic, "quiz1_score": req.quiz1_score}
 
 
@app.get("/student/{student_id}/rl-strategies")
def get_rl_strategies(student_id: str, topic: str = None):
    """
    Return the best teaching strategies learned for this student.
    Useful for admin/analytics dashboard.
    """
    strategies = get_best_strategies(student_id, topic)
    return {
        "student_id": student_id,
        "top_strategies": strategies
    }
 
 
@app.get("/student/{student_id}/rl-session/{topic}")
def get_rl_session(student_id: str, topic: str):
    """Debug endpoint — see current RL session state."""
    resolved = resolve_topic(topic)
    if not resolved:
        raise Exception("400: Topic not recognised")
    summary = get_session_summary(student_id, resolved)
    return {"student_id": student_id, "topic": resolved, **summary}
 