"""
student_tracker.py
Handles all MongoDB operations for student progress tracking.
Collection: students
"""
from pymongo import MongoClient
from datetime import datetime
import uuid
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["adaptive_learning"]
students = db["students"]

students.create_index("name", unique=True)

# ── Create / Get ─────────────────────────────────────────────────────────────


def create_student(name: str) -> dict:
    # Check if student already exists
    existing = students.find_one({"name": name})

    if existing:
        existing.pop("_id", None)
        return existing

    # Otherwise create new
    student = {
        "student_id": str(uuid.uuid4()),
        "name": name,
        "created_at": datetime.utcnow().isoformat(),
        "topic_scores": {},       # { "loops": [72, 85, 90], "recursion": [40] }
        "weak_areas": [],         # topics where avg score < 60
        "chat_history": [],       # last 20 messages for context
        "quiz_history": [],       # full quiz records
        "topics_completed": [],   # topics attempted at least once
    }

    students.insert_one(student)
    student.pop("_id", None)
    return student


def get_student(student_id: str) -> dict | None:
    student = students.find_one({"student_id": student_id}, {"_id": 0})
    return student


def get_or_create_student(student_id: str, name: str = "Student") -> dict:
    student = get_student(student_id)
    if not student:
        student = create_student(name)
    return student


# ── Progress Updates ──────────────────────────────────────────────────────────

def record_quiz_result(student_id: str, topic: str, score: float, difficulty: str):
    """Store quiz score and update weak areas."""
    record = {
        "topic": topic,
        "score": score,
        "difficulty": difficulty,
        "date": datetime.utcnow().isoformat()
    }

    students.update_one(
        {"student_id": student_id},
        {
            "$push": {
                f"topic_scores.{topic}": score,
                "quiz_history": record,
                "topics_completed": topic
            }
        }
    )

    _update_weak_areas(student_id)


def _update_weak_areas(student_id: str):
    """Recalculate weak areas — topics where average score < 60."""
    student = get_student(student_id)
    if not student:
        return

    weak = []
    for topic, scores in student.get("topic_scores", {}).items():
        if scores:
            avg = sum(scores) / len(scores)
            if avg < 60:
                weak.append(topic)

    students.update_one(
        {"student_id": student_id},
        {"$set": {"weak_areas": weak}}
    )


def update_chat_history(student_id: str, role: str, content: str):
    """Append a message to chat history, keep last 20."""
    students.update_one(
        {"student_id": student_id},
        {"$push": {"chat_history": {
            "$each": [{"role": role, "content": content}],
            "$slice": -20
        }}}
    )


def get_chat_history(student_id: str) -> list:
    student = get_student(student_id)
    if not student:
        return []
    return student.get("chat_history", [])


# ── Adaptive Suggestions ──────────────────────────────────────────────────────

def suggest_next_difficulty(student_id: str, topic: str) -> str:
    """
    Suggest difficulty based on score history for this topic.
    - No history → easy
    - Last score > 80 → bump up
    - Last score < 50 → drop down
    - Otherwise → keep same
    """
    student = get_student(student_id)
    if not student:
        return "easy"

    scores = student.get("topic_scores", {}).get(topic, [])
    if not scores:
        return "easy"

    last = scores[-1]
    if last >= 80:
        return "medium" if len(scores) < 3 else "hard"
    if last < 50:
        return "easy"
    return "medium"


def get_progress_summary(student_id: str) -> dict:
    student = get_student(student_id)
    if not student:
        return {}

    summary = {}
    for topic, scores in student.get("topic_scores", {}).items():
        if scores:
            summary[topic] = {
                "attempts": len(scores),
                "avg_score": round(sum(scores) / len(scores), 1),
                "best_score": max(scores),
                "last_score": scores[-1],
                "trend": "improving" if len(scores) > 1 and scores[-1] > scores[-2] else
                         "declining" if len(scores) > 1 and scores[-1] < scores[-2] else "stable"
            }

    return {
        "student_id": student_id,
        "name": student.get("name"),
        "weak_areas": student.get("weak_areas", []),
        "topics_completed": list(set(student.get("topics_completed", []))),
        "topic_progress": summary,
        "total_quizzes": len(student.get("quiz_history", []))
    }