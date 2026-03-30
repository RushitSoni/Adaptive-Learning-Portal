"""
bkt.py — Bayesian Knowledge Tracing
Tracks P(mastery) per concept per student.
Runs independently of RL — feeds a cleaner `perf_band` into RL state.

BKT Parameters (per concept, can be tuned):
  P(L0)    = prior probability student already knows concept
  P(T)     = probability of learning from one exposure (transit)
  P(G)     = probability of correct answer despite NOT knowing (guess)
  P(S)     = probability of wrong answer despite knowing (slip)

Update Rule (Bayes):
  After correct answer:
    P(L|correct) = P(L)*( 1-P(S) ) / [ P(L)*(1-P(S)) + (1-P(L))*P(G) ]
  After wrong answer:
    P(L|wrong)   = P(L)*P(S)       / [ P(L)*P(S)     + (1-P(L))*(1-P(G)) ]

  Then apply learning (transit):
    P(L_new) = P(L|obs) + (1 - P(L|obs)) * P(T)
"""

from pymongo import MongoClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["adaptive_learning"]
bkt_col = db["bkt_states"]          # one doc per (student_id, topic)


# ── Default BKT parameters ────────────────────────────────────────────────────
# These are reasonable defaults for Python basics.
# Can be overridden per topic in TOPIC_PARAMS below.

DEFAULT_PARAMS = {
    "p_l0":  0.20,   # low prior — assume student doesn't know it yet
    "p_t":   0.15,   # moderate learning rate per exposure
    "p_g":   0.20,   # guess probability (MCQ with 4 options ≈ 0.25)
    "p_s":   0.10,   # slip probability (knows it but makes silly mistake)
}

# Topic-specific overrides (tune as you gather data)
TOPIC_PARAMS = {
    "loops":      {"p_l0": 0.25, "p_t": 0.20, "p_g": 0.20, "p_s": 0.10},
    "functions":  {"p_l0": 0.20, "p_t": 0.15, "p_g": 0.20, "p_s": 0.10},
    "recursion":  {"p_l0": 0.10, "p_t": 0.10, "p_g": 0.20, "p_s": 0.15},  # harder
    "OOP":        {"p_l0": 0.10, "p_t": 0.10, "p_g": 0.20, "p_s": 0.15},
    "strings":    {"p_l0": 0.30, "p_t": 0.20, "p_g": 0.20, "p_s": 0.08},
    "lists":      {"p_l0": 0.30, "p_t": 0.20, "p_g": 0.20, "p_s": 0.08},
    "dicts":      {"p_l0": 0.20, "p_t": 0.15, "p_g": 0.20, "p_s": 0.10},
    "exceptions": {"p_l0": 0.15, "p_t": 0.12, "p_g": 0.20, "p_s": 0.12},
}


# ── Mastery thresholds → performance band ─────────────────────────────────────
# These map P(mastery) → the perf_band used in RL state

def mastery_to_band(p_mastery: float) -> str:
    """
    Convert P(mastery) float → human-readable performance band.
    Used as one dimension of RL state.
    """
    if p_mastery < 0.30:
        return "struggling"
    if p_mastery < 0.55:
        return "average"
    if p_mastery < 0.80:
        return "good"
    return "strong"


# ── Core BKT Functions ────────────────────────────────────────────────────────

def _get_params(topic: str) -> dict:
    return TOPIC_PARAMS.get(topic, DEFAULT_PARAMS)


def _get_or_init_state(student_id: str, topic: str) -> dict:
    """Fetch BKT state from MongoDB, or initialise with prior."""
    doc = bkt_col.find_one(
        {"student_id": student_id, "topic": topic},
        {"_id": 0}
    )
    if doc:
        return doc

    params = _get_params(topic)
    new_doc = {
        "student_id": student_id,
        "topic": topic,
        "p_mastery": params["p_l0"],    # start at prior
        "n_observations": 0,            # total answers seen
        "params": params
    }
    bkt_col.insert_one(new_doc)
    return {k: v for k, v in new_doc.items() if k != "_id"}


def update_bkt(student_id: str, topic: str, is_correct: bool) -> dict:
    """
    Update P(mastery) after a student answers a question.

    Args:
        student_id : student identifier
        topic      : concept being tested
        is_correct : True if student answered correctly

    Returns:
        dict with updated p_mastery, perf_band, n_observations
    """
    state = _get_or_init_state(student_id, topic)
    p = state["params"]
    p_l = state["p_mastery"]

    # ── Step 1: Bayesian update given observation ─────────────────────────
    if is_correct:
        numerator   = p_l * (1 - p["p_s"])
        denominator = numerator + (1 - p_l) * p["p_g"]
    else:
        numerator   = p_l * p["p_s"]
        denominator = numerator + (1 - p_l) * (1 - p["p_g"])

    # Guard against zero division (shouldn't happen with valid params)
    p_l_given_obs = numerator / denominator if denominator > 0 else p_l

    # ── Step 2: Apply learning transit ───────────────────────────────────
    p_l_new = p_l_given_obs + (1 - p_l_given_obs) * p["p_t"]

    # Clamp to valid probability range
    p_l_new = max(0.0, min(1.0, p_l_new))

    n_obs = state["n_observations"] + 1

    # ── Persist ───────────────────────────────────────────────────────────
    bkt_col.update_one(
        {"student_id": student_id, "topic": topic},
        {"$set": {"p_mastery": p_l_new, "n_observations": n_obs}}
    )

    return {
        "p_mastery": round(p_l_new, 4),
        "perf_band": mastery_to_band(p_l_new),
        "n_observations": n_obs
    }


def get_mastery(student_id: str, topic: str) -> dict:
    """
    Get current P(mastery) and perf_band for a student-topic pair.
    Initialises at prior if not seen before.
    """
    state = _get_or_init_state(student_id, topic)
    p_m   = state["p_mastery"]
    return {
        "p_mastery": round(p_m, 4),
        "perf_band": mastery_to_band(p_m),
        "n_observations": state["n_observations"]
    }


def get_all_mastery(student_id: str) -> list:
    """Return mastery state for all topics this student has touched."""
    docs = bkt_col.find({"student_id": student_id}, {"_id": 0, "params": 0})
    result = []
    for doc in docs:
        result.append({
            "topic":          doc["topic"],
            "p_mastery":      round(doc["p_mastery"], 4),
            "perf_band":      mastery_to_band(doc["p_mastery"]),
            "n_observations": doc["n_observations"]
        })
    return result


def bulk_update_bkt_from_quiz(
    student_id: str,
    topic: str,
    mcq_results: list,       # list of bool (correct/wrong per MCQ)
    code_io_results: list,   # list of bool
    coding_scores: list      # list of float 0-100
) -> dict:
    """
    Convenience wrapper — update BKT from a full quiz result.
    Coding questions are treated as correct if score >= 60%.

    Returns final p_mastery and perf_band after all updates.
    """
    all_observations = (
        mcq_results +
        code_io_results +
        [s >= 60 for s in coding_scores]
    )

    result = {}
    for is_correct in all_observations:
        result = update_bkt(student_id, topic, is_correct)

    # If quiz had no gradeable questions, just return current state
    if not all_observations:
        result = get_mastery(student_id, topic)

    return result
