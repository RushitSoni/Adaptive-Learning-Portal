"""
rl_policy.py — RL Policy (Contextual Bandit + Level-2 sequence awareness)

Design decisions:
  - State: (topic, difficulty, query_type, perf_band, last_action)
            5D tuple — Level 2 from day 1, but γ=0 until data justifies it
  - Actions: 8 Python-specific teaching strategies
  - Q-table: stored in MongoDB (one global doc + one doc per student)
  - Selection: ε-greedy with decay, blended global+student Q-values
  - Cold start: heuristic prior → global Q warmup → LLM fallback (optional)
  - Update: Qnew = Qold + α(R - Qold)   [no γ, episodic]

MongoDB collections:
  rl_global_q   : one document, global Q-table across all students
  rl_student_q  : one document per student_id, student-specific Q-table
"""

import math
import random
import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["adaptive_learning"]

global_q_col   = db["rl_global_q"]
student_q_col  = db["rl_student_q"]


# ── Constants ─────────────────────────────────────────────────────────────────

ACTIONS = [
    "step_by_step",      # numbered micro-steps with inline comments
    "code_first",        # working snippet first, explanation after
    "analogy_first",     # real-world analogy before any code
    "trace_through",     # execute code line-by-line in explanation
    "mistake_focused",   # show wrong code first, then fix it
    "minimal_example",   # smallest possible working example
    "socratic",          # guiding questions instead of direct answer
    "compare_contrast",  # two approaches side by side
]

ALPHA = 0.15      # learning rate — how fast Q updates (0.1–0.2 is standard)

# Blend weights: how much to trust global vs student Q
# Student weight grows as they accumulate interactions (see _blend_weights)
MAX_STUDENT_WEIGHT = 0.70    # cap: never fully ignore global knowledge
STUDENT_WARMUP_N   = 20      # interactions to reach max student weight

# ε-greedy decay parameters
EPSILON_START = 0.50
EPSILON_MIN   = 0.05
EPSILON_DECAY = 15           # interactions for ε to halve


# ── Heuristic Cold-Start Prior ────────────────────────────────────────────────
# Fires when Q-table has ZERO data for a state.
# Maps (query_type, perf_band) → best default action.
# Based on educational psychology, not data.

COLD_START_PRIOR = {
    ("conceptual", "struggling"): "analogy_first",
    ("conceptual", "average"):    "code_first",
    ("conceptual", "good"):       "minimal_example",
    ("conceptual", "strong"):     "socratic",
    ("conceptual", "cold"):       "analogy_first",

    ("debug",      "struggling"): "trace_through",
    ("debug",      "average"):    "mistake_focused",
    ("debug",      "good"):       "mistake_focused",
    ("debug",      "strong"):     "socratic",
    ("debug",      "cold"):       "trace_through",

    ("compare",    "struggling"): "compare_contrast",
    ("compare",    "average"):    "compare_contrast",
    ("compare",    "good"):       "compare_contrast",
    ("compare",    "strong"):     "compare_contrast",
    ("compare",    "cold"):       "compare_contrast",

    ("application","struggling"): "step_by_step",
    ("application","average"):    "code_first",
    ("application","good"):       "minimal_example",
    ("application","strong"):     "socratic",
    ("application","cold"):       "code_first",
}

DEFAULT_COLD_ACTION = "code_first"


# ── State Builder ─────────────────────────────────────────────────────────────

def build_state(
    topic: str,
    difficulty: str,
    query_type: str,
    perf_band: str,
    last_action: str = "none"
) -> str:
    """
    Encode 5 dimensions into a single string key for Q-table lookup.

    Args:
        topic       : e.g. "loops", "recursion"
        difficulty  : "easy" | "medium" | "hard"
        query_type  : "conceptual" | "debug" | "compare" | "application"
        perf_band   : "cold" | "struggling" | "average" | "good" | "strong"
                      (derived from BKT P(mastery))
        last_action : previous action in this session, or "none" if first

    Returns:
        state string, e.g. "loops__easy__debug__struggling__trace_through"
    """
    return f"{topic}__{difficulty}__{query_type}__{perf_band}__{last_action}"


def classify_query_type_rl(question: str) -> str:
    """
    Classify question into one of 4 RL query types.
    More granular than prompt_router's 3-way split.
    """
    q = question.lower()

    # Debug signals
    debug_signals = ["my code", "this code", "fix this", "debug",
                     "what's wrong", "not working", "getting error", "error in"]
    if any(s in q for s in debug_signals):
        return "debug"

    # Compare signals
    compare_signals = ["difference", "compare", "vs", "versus",
                       "better", "which one", "when to use"]
    if any(s in q for s in compare_signals):
        return "compare"

    # Application signals
    app_signals = ["how do i", "how to", "implement", "write a",
                   "create a", "build", "make a", "can i use"]
    if any(s in q for s in app_signals):
        return "application"

    # Default → conceptual
    return "conceptual"


# ── Q-Table Access (MongoDB) ──────────────────────────────────────────────────

def _get_global_q() -> dict:
    doc = global_q_col.find_one({"_id": "global"}, {"_id": 0})
    return doc.get("q_table", {}) if doc else {}


def _get_student_q(student_id: str) -> dict:
    doc = student_q_col.find_one({"student_id": student_id}, {"_id": 0})
    return doc.get("q_table", {}) if doc else {}


def _get_student_interaction_count(student_id: str) -> int:
    doc = student_q_col.find_one({"student_id": student_id}, {"_id": 0})
    return doc.get("n_interactions", 0) if doc else 0


def _save_global_q(q_table: dict):
    global_q_col.update_one(
        {"_id": "global"},
        {"$set": {"q_table": q_table}},
        upsert=True
    )


def _save_student_q(student_id: str, q_table: dict, n_interactions: int):
    student_q_col.update_one(
        {"student_id": student_id},
        {"$set": {"q_table": q_table, "n_interactions": n_interactions}},
        upsert=True
    )


# ── Core Logic ────────────────────────────────────────────────────────────────

def _blend_weights(n_interactions: int) -> tuple[float, float]:
    """
    Compute (global_weight, student_weight) based on how many
    interactions the student has had.

    n=0  → (1.0, 0.0)  fully trust global
    n=20 → (0.3, 0.7)  mostly trust student
    """
    student_w = min(MAX_STUDENT_WEIGHT, n_interactions / STUDENT_WARMUP_N)
    global_w  = 1.0 - student_w
    return global_w, student_w


def _epsilon(n_interactions: int) -> float:
    """ε decays exponentially. More interactions → less exploration."""
    return max(
        EPSILON_MIN,
        EPSILON_START * math.exp(-n_interactions / EPSILON_DECAY)
    )


def _q_values_for_state(
    state: str,
    global_q: dict,
    student_q: dict,
    global_w: float,
    student_w: float
) -> dict:
    """
    Compute blended Q-values for all actions in a given state.
    Missing entries default to 0.0 (optimistic initialisation not used —
    cold start is handled separately via heuristic prior).
    """
    blended = {}
    for action in ACTIONS:
        g = global_q.get(state, {}).get(action, 0.0)
        s = student_q.get(state, {}).get(action, 0.0)
        blended[action] = global_w * g + student_w * s
    return blended


def _cold_start_action(query_type: str, perf_band: str) -> str:
    """Return heuristic action when Q-table has zero data for this state."""
    return COLD_START_PRIOR.get((query_type, perf_band), DEFAULT_COLD_ACTION)


def select_action(
    student_id: str,
    state: str,
    query_type: str,
    perf_band: str,
    force_explore: bool = False
) -> dict:
    """
    Select a teaching strategy (action) for the given state.

    Returns:
        {
          "action": str,
          "epsilon": float,
          "explored": bool,       # True if random exploration
          "cold_start": bool,     # True if Q-table had no data
          "q_values": dict        # blended Q for all actions (for logging)
        }
    """
    global_q  = _get_global_q()
    student_q = _get_student_q(student_id)
    n         = _get_student_interaction_count(student_id)
    gw, sw    = _blend_weights(n)
    eps       = _epsilon(n)

    blended_q = _q_values_for_state(state, global_q, student_q, gw, sw)

    # Check if this state is completely unseen (all Q-values are 0)
    state_seen = any(
        state in q and any(v != 0.0 for v in q[state].values())
        for q in [global_q, student_q]
    )

    # ── Cold start: use heuristic prior ──────────────────────────────────
    if not state_seen:
        action = _cold_start_action(query_type, perf_band)
        return {
            "action":     action,
            "epsilon":    eps,
            "explored":   False,
            "cold_start": True,
            "q_values":   blended_q
        }

    # ── ε-greedy selection ────────────────────────────────────────────────
    if force_explore or random.random() < eps:
        action   = random.choice(ACTIONS)
        explored = True
    else:
        action   = max(blended_q, key=blended_q.get)
        explored = False

    return {
        "action":     action,
        "epsilon":    round(eps, 4),
        "explored":   explored,
        "cold_start": False,
        "q_values":   {k: round(v, 4) for k, v in blended_q.items()}
    }


def update_q(
    student_id: str,
    state: str,
    action: str,
    reward: float
):
    """
    Update Q-table for both global and student tables.

    Rule: Qnew = Qold + α(R - Qold)
    No γ — episodic bandit, not sequential MDP.

    Args:
        student_id : student identifier
        state      : state string from build_state()
        action     : action that was taken
        reward     : normalised reward ∈ [-1, 1]
                     positive = score improved, negative = declined
    """
    # ── Update global Q ───────────────────────────────────────────────────
    global_q = _get_global_q()
    if state not in global_q:
        global_q[state] = {a: 0.0 for a in ACTIONS}
    old_g = global_q[state].get(action, 0.0)
    global_q[state][action] = round(old_g + ALPHA * (reward - old_g), 6)
    _save_global_q(global_q)

    # ── Update student Q ──────────────────────────────────────────────────
    student_q = _get_student_q(student_id)
    n         = _get_student_interaction_count(student_id)
    if state not in student_q:
        student_q[state] = {a: 0.0 for a in ACTIONS}
    old_s = student_q[state].get(action, 0.0)
    student_q[state][action] = round(old_s + ALPHA * (reward - old_s), 6)
    _save_student_q(student_id, student_q, n + 1)


def compute_reward(quiz1_score: float, quiz2_score: float) -> float:
    """
    Normalised reward — accounts for ceiling effect.
    If student already scored 95, gaining 3 points is harder than
    gaining 3 points from 50. Normalised reward captures this.

    Formula: (S2 - S1) / (100 - S1)
    Clamped to [-1, 1].

    Edge case: if S1 = 100, reward = 0 (can't improve further).
    """
    if quiz1_score >= 100:
        return 0.0
    raw = (quiz2_score - quiz1_score) / (100.0 - quiz1_score)
    return round(max(-1.0, min(1.0, raw)), 4)


def compute_recency_weights(n_doubts: int) -> list[float]:
    """
    Assign credit weights to doubts between Quiz1 and Quiz2.
    More recent doubts get more credit.
    Uses exponential recency: weight ∝ exp(position)

    Example for 3 doubts:
      [0.16, 0.31, 0.53]  (older → newer)
    """
    if n_doubts == 0:
        return []
    if n_doubts == 1:
        return [1.0]

    raw     = [math.exp(i) for i in range(n_doubts)]
    total   = sum(raw)
    weights = [round(w / total, 4) for w in raw]
    return weights


def get_best_strategies(student_id: str, topic: str = None) -> list:
    """
    Return top actions by Q-value for a student (optionally filtered by topic).
    Useful for progress/analytics endpoints.
    """
    student_q = _get_student_q(student_id)
    results   = []

    for state, action_values in student_q.items():
        if topic and not state.startswith(topic):
            continue
        best_action = max(action_values, key=action_values.get)
        best_value  = action_values[best_action]
        results.append({
            "state":       state,
            "best_action": best_action,
            "q_value":     best_value
        })

    results.sort(key=lambda x: x["q_value"], reverse=True)
    return results[:10]   # top 10
