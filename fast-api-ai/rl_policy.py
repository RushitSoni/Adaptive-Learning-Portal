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
  rl_cold_cache : [NEW] cache of LLM-generated cold-start Q-vectors,
                  keyed by (query_type, perf_band, topic) so LLM is
                  called at most once per unique cold-start context.
 
Cold-start strategy (NEW — replaces static COLD_START_PRIOR dict):
──────────────────────────────────────────────────────────────────
  OLD: hardcoded (query_type, perf_band) → single action string
       Limitation: ignores topic, ignores difficulty, one size fits all,
       requires manual maintenance as actions change.
 
  NEW (3-layer cascade):
    Layer 1 — MongoDB cache lookup
      (query_type, perf_band, topic, difficulty) → pre-scored Q-vector
      If the same cold-start context was seen before, reuse it instantly.
      Cache never expires (LLM reasoning about pedagogy doesn't go stale).
 
    Layer 2 — LLM scoring via  API
      Ask the LLM to score all 8 actions (0–10) for this exact context.
      LLM sees: topic, difficulty, query_type, perf_band, action definitions.
      Scores are normalised to [0, 1] and written into the Q-table as a
      warm prior — so the RL system starts from a reasoned baseline instead
      of zero, and updates from there.
      Result is saved to the cache so the LLM is never called twice for the
      same context.
 
    Layer 3 — Static fallback (safety net only)
      If the LLM call fails (timeout, API error, no key set), the old
      COLD_START_PRIOR dict is used as a last resort.
      This means the system degrades gracefully — it never crashes.
"""
import json
import math
import random
import os
import logging
import requests
from pymongo import MongoClient
 
from groq_client import call_groq
from embedding_client import get_embedding, get_embeddings

logger = logging.getLogger(__name__)
 
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["adaptive_learning"]
 
global_q_col   = db["rl_global_q"]
student_q_col  = db["rl_student_q"]
cold_cache_col = db["rl_cold_cache"]   # NEW: LLM cold-start cache


def _cosine_sim(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _mean_vector(vectors):
    n = len(vectors)
    dim = len(vectors[0])
    out = [0.0] * dim
    for vec in vectors:
        for i in range(dim):
            out[i] += vec[i]
    return [v / n for v in out]
 
 
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
 
# Human-readable descriptions sent to the LLM so it understands what
# each action means. Kept here so they stay in sync with ACTIONS.
ACTION_DESCRIPTIONS = {
    "step_by_step":     "Break the answer into numbered micro-steps with inline comments — best for scaffolding complex procedures",
    "code_first":       "Show a working code snippet first, then explain it — best for learners who think in code",
    "analogy_first":    "Lead with a real-world analogy before any code — best for abstract or conceptual topics",
    "trace_through":    "Walk through code execution line-by-line — best for debugging and understanding flow",
    "mistake_focused":  "Show incorrect code first, then correct it with explanation — best for common errors",
    "minimal_example":  "Provide the smallest possible working example — best for focused, distraction-free learning",
    "socratic":         "Guide the student with questions rather than direct answers — best for strong students who need nudging",
    "compare_contrast": "Present two approaches side by side — best for comparison and decision-making questions",
}
 
ALPHA = 0.15      # learning rate — how fast Q updates (0.1–0.2 is standard)
 
# Blend weights: how much to trust global vs student Q
# Student weight grows as they accumulate interactions (see _blend_weights)
MAX_STUDENT_WEIGHT = 0.70    # cap: never fully ignore global knowledge
STUDENT_WARMUP_N   = 20      # interactions to reach max student weight
 
# ε-greedy decay parameters
EPSILON_START = 0.50
EPSILON_MIN   = 0.05
EPSILON_DECAY = 15           # interactions for ε to halve
 


# ── Static Fallback Prior (safety net — used only if LLM fails) ───────────────
# This was the OLD cold-start system. Now it is only a last-resort fallback.
# It is intentionally kept so the system never crashes on LLM failure.
 
_STATIC_FALLBACK_PRIOR = {
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
 
_DEFAULT_COLD_ACTION = "code_first"
 
 
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
 
CLASS_DESCRIPTIONS = {
    "debug": [
        "my code is not working and I need help fixing it",
        "I am getting an error in my program",
        "why is this code giving the wrong output",
        "help me find the bug in my code",
        "this function throws an exception, how do I fix it",
        "my loop is running forever or not stopping",
        "the output is wrong, what did I do incorrectly",
    ],
    "compare": [
        "what is the difference between two things",
        "compare these two approaches or concepts",
        "which one should I use and when",
        "what are the pros and cons of each option",
        "how is one different from the other",
        "when should I prefer one over the other",
    ],
    "application": [
        "how do I implement this in Python",
        "show me how to write code that does something",
        "I want to build or create something, how do I start",
        "give me an example of how to use this",
        "write a function or program that does this task",
        "how do I use this concept in a real program",
    ],
    "conceptual": [
        "explain what this concept means",
        "what is this and how does it work",
        "I want to understand the theory behind this",
        "why does Python work this way",
        "what does this term mean in programming",
        "help me understand this idea",
    ],
}

 
 
# ── Pre-compute class embeddings at import time ───────────────────────────────
# Each class → mean embedding of all its descriptions.
# This is free to compute and only happens once.
 
def _build_class_embeddings() -> dict:
    class_embeddings = {}
    for label, descriptions in CLASS_DESCRIPTIONS.items():
        embeddings = get_embeddings(descriptions)
        # Average across all descriptions → single representative vector per class
        class_embeddings[label] = _mean_vector(embeddings)
    return class_embeddings
 
_CLASS_EMBEDDINGS = _build_class_embeddings()
 
 
# ── Main classifier ───────────────────────────────────────────────────────────
 
def classify_query_type_for_rl(question: str) -> str:
    """
    Classify a student question into one of 4 RL query types.
    Uses semantic similarity — no keyword lists.
 
    Args:
        question: raw student question string
 
    Returns:
        One of: "debug" | "compare" | "application" | "conceptual"
 
    Examples:
        "why won't my loop stop?"           → "debug"
        "list vs tuple, which is better?"   → "compare"
        "how do I read a file in Python?"   → "application"
        "what exactly is a closure?"        → "conceptual"
    """
    if not question or not question.strip():
        return "conceptual"  # safe default
 
    # Embed the incoming question
    q_embedding = get_embedding(question.strip())
 
    # Compute cosine similarity against each class centroid
    scores = {
        label: _cosine_sim(q_embedding, class_vec)
        for label, class_vec in _CLASS_EMBEDDINGS.items()
    }
 
    # Return the label with highest similarity
    return max(scores, key=scores.get)
 

def classify_with_scores(question: str) -> dict:
    """
    Same as classify_query_type_for_rl but returns all scores.
    Useful for debugging misclassifications or building confidence thresholds.
 
    Example output:
    {
        "predicted": "debug",
        "scores": {
            "debug": 0.821,
            "compare": 0.312,
            "application": 0.489,
            "conceptual": 0.401
        },
        "confidence": 0.821
    }
    """
    if not question or not question.strip():
        return {"predicted": "conceptual", "scores": {}, "confidence": 0.0}
 
    q_embedding = get_embedding(question.strip())
 
    scores = {
        label: round(_cosine_sim(q_embedding, class_vec), 4)
        for label, class_vec in _CLASS_EMBEDDINGS.items()
    }
 
    predicted = max(scores, key=scores.get)
    return {
        "predicted":  predicted,
        "scores":     scores,
        "confidence": scores[predicted],
    }
 

 
# def classify_query_type_rl(question: str) -> str:
#     """
#     Classify question into one of 4 RL query types.
#     More granular than prompt_router's 3-way split.
#     """
#     q = question.lower()

#     # Debug signals
#     debug_signals = ["my code", "this code", "fix this", "debug",
#                      "what's wrong", "not working", "getting error", "error in"]
#     if any(s in q for s in debug_signals):
#         return "debug"

#     # Compare signals
#     compare_signals = ["difference", "compare", "vs", "versus",
#                        "better", "which one", "when to use"]
#     if any(s in q for s in compare_signals):
#         return "compare"

#     # Application signals
#     app_signals = ["how do i", "how to", "implement", "write a",
#                    "create a", "build", "make a", "can i use"]
#     if any(s in q for s in app_signals):
#         return "application"

#     # Default → conceptual
#     return "conceptual"


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

# ── NEW: LLM Cold-Start Cache (MongoDB) ───────────────────────────────────────
 
def _cache_key(query_type: str, perf_band: str, topic: str, difficulty: str) -> str:
    """Deterministic string key for the cold-start cache."""
    return f"{query_type}__{perf_band}__{topic}__{difficulty}"
 
 
def _get_cached_cold_q(
    query_type: str, perf_band: str, topic: str, difficulty: str
) -> dict | None:
    """
    Look up a previously LLM-generated Q-vector for this cold-start context.
    Returns dict of {action: score} or None if not cached.
    """
    key = _cache_key(query_type, perf_band, topic, difficulty)
    doc = cold_cache_col.find_one({"_id": key}, {"_id": 0})
    return doc.get("q_vector") if doc else None
 
 
def _save_cold_cache(
    query_type: str, perf_band: str, topic: str, difficulty: str,
    q_vector: dict
):
    """Persist a LLM-generated Q-vector to the cold-start cache."""
    key = _cache_key(query_type, perf_band, topic, difficulty)
    cold_cache_col.update_one(
        {"_id": key},
        {"$set": {"q_vector": q_vector, "source": "llm"}},
        upsert=True
    )
 
 
# ── NEW: LLM Cold-Start Scorer ────────────────────────────────────────────────
 
def _build_llm_prompt(
    query_type: str, perf_band: str, topic: str, difficulty: str
) -> str:
    """
    Build the prompt that asks the LLM to score all actions for this context.
    Returns a strict JSON-only prompt so parsing is reliable.
    """
    action_lines = "\n".join(
        f'  "{action}": {desc}'
        for action, desc in ACTION_DESCRIPTIONS.items()
    )
 
    perf_descriptions = {
        "cold":       "no prior performance data (brand new student)",
        "struggling": "below 40% mastery, frequently confused, needs heavy scaffolding",
        "average":    "40–70% mastery, understands basics but makes mistakes",
        "good":       "70–85% mastery, mostly solid, occasional gaps",
        "strong":     "85%+ mastery, confident, benefits from challenge",
    }
    perf_desc = perf_descriptions.get(perf_band, perf_band)
 
    return f"""You are an expert in adaptive educational pedagogy for Python programming.
 
A student is asking about the Python topic: "{topic}" at difficulty level: "{difficulty}".
Their question type is: "{query_type}" (conceptual understanding / debugging / application / comparison).
Their current performance band is: {perf_band} — {perf_desc}.
 
You must score each of the following 8 teaching strategies from 0 to 10 based on how well
each strategy fits this specific student context. 10 = ideal fit, 0 = completely wrong fit.
 
Teaching strategies:
{action_lines}
 
Consider:
- What does this student need most given their performance level?
- What style of explanation best matches this query type?
- What works best for this specific Python topic?
 
Respond ONLY with a valid JSON object — no explanation, no markdown, no preamble.
Format:
{{
  "step_by_step": <int 0-10>,
  "code_first": <int 0-10>,
  "analogy_first": <int 0-10>,
  "trace_through": <int 0-10>,
  "mistake_focused": <int 0-10>,
  "minimal_example": <int 0-10>,
  "socratic": <int 0-10>,
  "compare_contrast": <int 0-10>
}}"""
 
 
def _call_llm_for_cold_start(
    query_type: str, perf_band: str, topic: str, difficulty: str
) -> dict | None:
    """
    Call  API to get scored Q-vector for a cold-start context.
 
    Returns:
        dict of {action: normalised_score ∈ [0,1]} if successful,
        None if API call fails for any reason.
 
    Scores from LLM (0–10) are normalised by dividing by 10
    so they live in [0, 1] — same scale as learned Q-values at early training.
    """
    
 
    prompt = _build_llm_prompt(query_type, perf_band, topic, difficulty)
 
    try:
        resp = call_groq([{"role": "user", "content": prompt}])
        raw_text = resp["content"].strip() 
        # rewritten = response["content"].strip()
 
        
 
        # Strip accidental markdown fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
 
        scores = json.loads(raw_text)
 
        # Validate all actions are present and values are numeric
        if not all(a in scores for a in ACTIONS):
            logger.warning("LLM cold-start response missing some actions: %s", scores)
            return None
 
        # Normalise 0–10 → 0.0–1.0
        normalised = {
            action: round(float(scores[action]) / 10.0, 4)
            for action in ACTIONS
        }
        return normalised
 
    except requests.Timeout:
        logger.warning("LLM cold-start timed out")
    except requests.RequestException as e:
        logger.warning("LLM cold-start HTTP error: %s", e)
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("LLM cold-start parse error: %s", e)
 
    return None
 
 
# ── NEW: Dynamic Cold-Start Orchestrator ──────────────────────────────────────
 
def _get_cold_start_q_vector(
    query_type: str, perf_band: str, topic: str, difficulty: str
) -> dict:
    """
    3-layer cascade to get a warm Q-vector for an unseen state.
 
    Layer 1: MongoDB cache  — instant, free
    Layer 2: LLM scoring    — ~1–3s, called once per unique context, then cached
    Layer 3: Static fallback — instant, always works
 
    Returns:
        dict of {action: float} — a full Q-vector for all ACTIONS.
        The best action is still max(q_vector), but RL can update from here.
    """
    # ── Layer 1: cache hit ────────────────────────────────────────────────
    cached = _get_cached_cold_q(query_type, perf_band, topic, difficulty)
    if cached:
        logger.debug("Cold-start: cache hit for (%s, %s, %s, %s)",
                     query_type, perf_band, topic, difficulty)
        return cached
 
    # ── Layer 2: LLM scoring ──────────────────────────────────────────────
    llm_vector = _call_llm_for_cold_start(query_type, perf_band, topic, difficulty)
    if llm_vector:
        logger.info("Cold-start: LLM scored context (%s, %s, %s, %s)",
                    query_type, perf_band, topic, difficulty)
        _save_cold_cache(query_type, perf_band, topic, difficulty, llm_vector)
        return llm_vector
 
    # ── Layer 3: static fallback ──────────────────────────────────────────
    logger.warning("Cold-start: falling back to static prior for (%s, %s)",
                   query_type, perf_band)
    best_action = _STATIC_FALLBACK_PRIOR.get(
        (query_type, perf_band), _DEFAULT_COLD_ACTION
    )
    # Build a Q-vector that strongly favours the static action
    # but isn't a one-hot vector (keeps exploration reasonable)
    fallback_vector = {a: 0.1 for a in ACTIONS}
    fallback_vector[best_action] = 0.9
    return fallback_vector


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


# ── UPDATED: select_action ────────────────────────────────────────────────────
 
def select_action(
    student_id: str,
    state: str,
    query_type: str,
    perf_band: str,
    topic: str = "unknown",        # NEW param — passed to LLM for richer context
    difficulty: str = "medium",    # NEW param — passed to LLM for richer context
    force_explore: bool = False
) -> dict:
    """
    Select a teaching strategy (action) for the given state.
 
    NEW: When state is unseen (cold start), calls LLM to generate a warm
    Q-vector instead of picking a single static action. This vector is
    written into the global Q-table as a prior, so future calls for the
    same state skip the LLM entirely and use learned values.
 
    Args:
        student_id   : student identifier
        state        : state string from build_state()
        query_type   : "conceptual" | "debug" | "compare" | "application"
        perf_band    : "cold" | "struggling" | "average" | "good" | "strong"
        topic        : [NEW] syllabus topic, e.g. "loops" (for LLM context)
        difficulty   : [NEW] "easy" | "medium" | "hard" (for LLM context)
        force_explore: if True, always pick randomly (for testing)
 
    Returns:
        {
          "action"     : str,
          "epsilon"    : float,
          "explored"   : bool,        True if random exploration
          "cold_start" : bool,        True if Q-table had no data
          "cold_source": str | None,  "cache" | "llm" | "static" | None
          "q_values"   : dict         blended Q for all actions (for logging)
        }
    """
    global_q  = _get_global_q()
    student_q = _get_student_q(student_id)
    n         = _get_student_interaction_count(student_id)
    gw, sw    = _blend_weights(n)
    eps       = _epsilon(n)
 
    # Check if this state is completely unseen (all Q-values are 0)
    state_seen = any(
        state in q and any(v != 0.0 for v in q[state].values())
        for q in [global_q, student_q]
    )
 
    # ── Cold start: dynamic LLM-scored prior ──────────────────────────────
    if not state_seen:
        cold_source = _resolve_cold_source(query_type, perf_band, topic, difficulty)
        q_vector    = _get_cold_start_q_vector(query_type, perf_band, topic, difficulty)
 
        # Write the LLM prior into global Q-table so future calls are warm
        global_q[state] = q_vector
        _save_global_q(global_q)
 
        # Pick best action from the LLM-scored vector
        action = max(q_vector, key=q_vector.get)
 
        return {
            "action":      action,
            "epsilon":     round(eps, 4),
            "explored":    False,
            "cold_start":  True,
            "cold_source": cold_source,
            "q_values":    {k: round(v, 4) for k, v in q_vector.items()},
        }
 
    blended_q = _q_values_for_state(state, global_q, student_q, gw, sw)
 
    # ── ε-greedy selection ────────────────────────────────────────────────
    if force_explore or random.random() < eps:
        action   = random.choice(ACTIONS)
        explored = True
    else:
        action   = max(blended_q, key=blended_q.get)
        explored = False
 
    return {
        "action":      action,
        "epsilon":     round(eps, 4),
        "explored":    explored,
        "cold_start":  False,
        "cold_source": None,
        "q_values":    {k: round(v, 4) for k, v in blended_q.items()},
    }
 
 
def _resolve_cold_source(
    query_type: str, perf_band: str, topic: str, difficulty: str
) -> str:
    """
    Peek at which layer will serve the cold start without actually calling it.
    Used only to populate the 'cold_source' field in select_action's return dict.
    """
    if _get_cached_cold_q(query_type, perf_band, topic, difficulty):
        return "cache"
    else :
        return "llm"
    
 
 
# ── update_q (unchanged logic, no signature change) ──────────────────────────
 
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
 
 
# ── Unchanged utilities ───────────────────────────────────────────────────────
 
def compute_reward(quiz1_score: float, quiz2_score: float) -> float:
    """
    Normalised reward — accounts for ceiling effect.
    Formula: (S2 - S1) / (100 - S1). Clamped to [-1, 1].
    """
    if quiz1_score >= 100:
        return 0.0
    raw = (quiz2_score - quiz1_score) / (100.0 - quiz1_score)
    return round(max(-1.0, min(1.0, raw)), 4)
 
 
def compute_recency_weights(n_doubts: int) -> list[float]:
    """
    Assign credit weights to doubts between Quiz1 and Quiz2.
    More recent doubts get more credit (exponential recency).
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
    Blends global and student Q-tables using the same weights as select_action.
    """
    global_q  = _get_global_q()
    student_q = _get_student_q(student_id)
    n         = _get_student_interaction_count(student_id)
    gw, sw    = _blend_weights(n)

    # Union of all states seen in either table
    all_states = set(global_q.keys()) | set(student_q.keys())

    results = []
    for state in all_states:
        if topic and not state.startswith(topic):
            continue

        # Blend Q-values for each action, same as select_action
        blended = {}
        for action in ACTIONS:
            g = global_q.get(state, {}).get(action, 0.0)
            s = student_q.get(state, {}).get(action, 0.0)
            blended[action] = gw * g + sw * s

        best_action = max(blended, key=blended.get)
        best_value  = blended[best_action]

        results.append({
            "state":        state,
            "best_action":  best_action,
            "q_value":      round(best_value, 6),
            "global_weight": round(gw, 4),
            "student_weight": round(sw, 4),
        })

    results.sort(key=lambda x: x["q_value"], reverse=True)
    return results[:10]
# def get_best_strategies(student_id: str, topic: str = None) -> list:
#     """
#     Return top actions by Q-value for a student (optionally filtered by topic).
#     """
#     student_q = _get_student_q(student_id)
#     results   = []
 
#     for state, action_values in student_q.items():
#         if topic and not state.startswith(topic):
#             continue
#         best_action = max(action_values, key=action_values.get)
#         best_value  = action_values[best_action]
#         results.append({
#             "state":       state,
#             "best_action": best_action,
#             "q_value":     best_value
#         })
 
#     results.sort(key=lambda x: x["q_value"], reverse=True)
#     return results[:10]