"""
rl_tracker.py — Session State Between Quiz1 → Quiz2

Tracks the "pending" interactions (doubts asked between two quizzes)
for each student per topic. When Quiz2 arrives, this module:
  1. Retrieves all pending (state, action) pairs
  2. Computes recency-weighted rewards
  3. Triggers Q-table updates via rl_policy.update_q()
  4. Clears the pending session

MongoDB collection: rl_sessions
One document per (student_id, topic) — overwritten each quiz cycle.

Document structure:
{
  "student_id": "...",
  "topic": "...",
  "quiz1_score": 72.0,
  "quiz1_difficulty": "medium",
  "pending_doubts": [
    {
      "state": "loops__easy__debug__struggling__none",
      "action": "trace_through",
      "timestamp": "2024-01-01T10:00:00"
    },
    ...
  ]
}
"""

from pymongo import MongoClient
from datetime import datetime
import os

from rl_policy import (
    update_q,
    compute_reward,
    compute_recency_weights
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client    = MongoClient(MONGO_URI)
db        = client["adaptive_learning"]
sessions  = db["rl_sessions"]


# ── Session Lifecycle ─────────────────────────────────────────────────────────

def start_session(student_id: str, topic: str, quiz1_score: float, difficulty: str):
    """
    Called when a student starts a new quiz cycle (after taking Quiz1).
    Resets pending doubts for this topic.

    Args:
        student_id  : student identifier
        topic       : e.g. "loops"
        quiz1_score : score on the just-taken quiz (0–100)
        difficulty  : difficulty of Quiz1
    """
    sessions.update_one(
        {"student_id": student_id, "topic": topic},
        {
            "$set": {
                "student_id":       student_id,
                "topic":            topic,
                "quiz1_score":      quiz1_score,
                "quiz1_difficulty": difficulty,
                "pending_doubts":   [],
                "started_at":       datetime.utcnow().isoformat()
            }
        },
        upsert=True
    )


def log_doubt(student_id: str, topic: str, state: str, action: str):
    """
    Log a doubt interaction during the Quiz1→Quiz2 window.
    Appends to pending_doubts list.

    Args:
        student_id : student identifier
        topic      : topic the doubt is about
        state      : RL state string from build_state()
        action     : teaching strategy used
    """
    doubt_entry = {
        "state":     state,
        "action":    action,
        "timestamp": datetime.utcnow().isoformat()
    }
    sessions.update_one(
        {"student_id": student_id, "topic": topic},
        {"$push": {"pending_doubts": doubt_entry}},
        upsert=True
    )


def close_session(student_id: str, topic: str, quiz2_score: float) -> dict:
    """
    Called when Quiz2 result arrives.
    Computes recency-weighted rewards and updates Q-tables.

    Args:
        student_id  : student identifier
        topic       : topic of the completed quiz cycle
        quiz2_score : score on Quiz2 (0–100)

    Returns:
        summary dict with reward, doubts processed, and updates made
    """
    session = sessions.find_one(
        {"student_id": student_id, "topic": topic},
        {"_id": 0}
    )

    if not session:
        # No session tracked — possibly student took Quiz2 without any doubts
        return {
            "status":         "no_session",
            "doubts_processed": 0,
            "reward":         None,
            "updates":        []
        }

    quiz1_score     = session.get("quiz1_score", quiz2_score)
    pending_doubts  = session.get("pending_doubts", [])
    n_doubts        = len(pending_doubts)

    # ── Compute base reward ───────────────────────────────────────────────
    base_reward = compute_reward(quiz1_score, quiz2_score)

    updates = []

    if n_doubts == 0:
        # Student took Quiz2 without asking any doubts — nothing to update
        _clear_session(student_id, topic)
        return {
            "status":           "no_doubts",
            "doubts_processed": 0,
            "reward":           base_reward,
            "updates":          []
        }

    # ── Recency-weighted credit assignment ────────────────────────────────
    weights = compute_recency_weights(n_doubts)

    for doubt, weight in zip(pending_doubts, weights):
        weighted_reward = round(base_reward * weight, 4)
        update_q(
            student_id = student_id,
            state      = doubt["state"],
            action     = doubt["action"],
            reward     = weighted_reward
        )
        updates.append({
            "state":           doubt["state"],
            "action":          doubt["action"],
            "weight":          weight,
            "weighted_reward": weighted_reward
        })

    # ── Archive and clear ─────────────────────────────────────────────────
    _archive_session(student_id, topic, quiz1_score, quiz2_score,
                     base_reward, updates)
    _clear_session(student_id, topic)

    return {
        "status":           "updated",
        "doubts_processed": n_doubts,
        "quiz1_score":      quiz1_score,
        "quiz2_score":      quiz2_score,
        "base_reward":      base_reward,
        "updates":          updates
    }


def get_last_action(student_id: str, topic: str) -> str:
    """
    Return the most recent action used for this student-topic pair.
    Used to build Level-2 state (last_action dimension).
    Returns "none" if no session or no doubts yet.
    """
    session = sessions.find_one(
        {"student_id": student_id, "topic": topic},
        {"_id": 0, "pending_doubts": 1}
    )
    if not session:
        return "none"
    doubts = session.get("pending_doubts", [])
    if not doubts:
        return "none"
    return doubts[-1]["action"]


def get_session_summary(student_id: str, topic: str) -> dict:
    """Return current session state — useful for debugging/admin."""
    session = sessions.find_one(
        {"student_id": student_id, "topic": topic},
        {"_id": 0}
    )
    if not session:
        return {"status": "no_active_session"}
    return {
        "quiz1_score":   session.get("quiz1_score"),
        "n_doubts":      len(session.get("pending_doubts", [])),
        "started_at":    session.get("started_at"),
        "last_actions":  [d["action"] for d in session.get("pending_doubts", [])]
    }


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _clear_session(student_id: str, topic: str):
    """Reset pending doubts after Quiz2 is processed."""
    sessions.update_one(
        {"student_id": student_id, "topic": topic},
        {"$set": {"pending_doubts": [], "quiz1_score": None}}
    )


def _archive_session(
    student_id: str,
    topic: str,
    quiz1_score: float,
    quiz2_score: float,
    reward: float,
    updates: list
):
    """
    Write a permanent record of this quiz cycle to rl_history collection.
    Useful for offline analysis and future DQN training data.
    """
    history_col = db["rl_history"]
    history_col.insert_one({
        "student_id":  student_id,
        "topic":       topic,
        "quiz1_score": quiz1_score,
        "quiz2_score": quiz2_score,
        "delta_score": round(quiz2_score - quiz1_score, 2),
        "reward":      reward,
        "n_doubts":    len(updates),
        "updates":     updates,
        "archived_at": datetime.utcnow().isoformat()
    })
