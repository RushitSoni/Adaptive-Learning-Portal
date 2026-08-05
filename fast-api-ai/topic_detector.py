import re
import math
from embedding_client import get_embedding, get_embeddings

# ── Similarity threshold ──────────────────────────────────────────────────────
# If no topic scores above this, detect_topic returns None (off-syllabus).
# Lower → more permissive (more matches, more false positives).
# Higher → stricter (fewer matches, more false negatives).
# 0.40 was calibrated empirically; adjust if you see consistent mis-drops.
_THRESHOLD = 0.40


# ── Topic Descriptions ────────────────────────────────────────────────────────
# These replace your keyword lists.
# Write them as natural language descriptions of what a student ACTUALLY SAYS
# when they're asking about that topic — not abstract labels.
#
# Multiple descriptions per topic = better coverage of how the same concept
# gets phrased differently. The topic embedding is their average.
#
# Tuning tip: if a topic is getting missed or mis-matched, ADD more description
# variants covering the failing phrasing. No code changes needed elsewhere.

TOPIC_DESCRIPTIONS = {
    "loops": [
        "how do I repeat something multiple times in Python",
        "using a for loop or while loop to go through items",
        "iterate over a list or range of numbers",
        "my loop is running forever and won't stop",
        "how do I use break or continue inside a loop",
        "looping through a collection with enumerate or zip",
        "nested loops and how to control them",
        "how to write a loop that counts or repeats",
    ],
    "recursion": [
        "what is recursion and how does it work",
        "writing a recursive function in Python",
        "what is a base case in recursion",
        "my recursive function causes a stack overflow or RecursionError",
        "how to solve factorial or fibonacci with recursion",
        "how does the call stack work with recursive calls",
        "memoization and caching recursive results with lru_cache",
    ],
    "exceptions": [
        "how do I handle errors in Python",
        "using try and except blocks to catch exceptions",
        "what does this error message or traceback mean",
        "how do I raise my own custom exception",
        "TypeError ValueError IndexError KeyError what do they mean",
        "using finally to run cleanup code after an error",
        "how to write safe code that doesn't crash on bad input",
    ],
    "functions": [
        "how do I define and call a function in Python",
        "what is the difference between parameters and arguments",
        "using default arguments and keyword arguments in functions",
        "what does the return statement do",
        "using *args and **kwargs in a function definition",
        "what is a lambda or anonymous function",
        "understanding scope, local variables, and global variables",
        "writing a docstring to document a function",
        "higher order functions and closures",
    ],
    "oop": [
        "how do I create a class and an object in Python",
        "what is __init__ and what does self mean",
        "how does inheritance work between a parent and child class",
        "what is method overriding and polymorphism",
        "using super() to call a parent class method",
        "what are dunder or magic methods like __str__ and __repr__",
        "difference between class methods, static methods, and instance methods",
        "what is encapsulation and abstraction in object oriented programming",
    ],
    "variables": [
        "how do I store a value in a variable",
        "what are the basic data types in Python like int float bool",
        "how do I convert between data types like int to string",
        "what does None mean in Python",
        "how does Python handle dynamic typing",
        "using arithmetic operators like modulus and floor division",
        "how to check the type of a variable with type() or isinstance()",
    ],
    "lists": [
        "how do I create and use a list in Python",
        "adding or removing items from a list with append pop remove",
        "how does list slicing work",
        "writing a list comprehension",
        "sorting or reversing a list",
        "how to work with nested or 2D lists",
        "checking if an item is in a list with the in operator",
        "unpacking a list into variables",
    ],
    "dictionaries": [
        "how do I create and use a dictionary in Python",
        "accessing values by key in a dictionary",
        "how to loop through keys values and items of a dict",
        "using get() to safely access a dictionary key",
        "writing a dictionary comprehension",
        "nested dictionaries and how to access them",
        "adding or updating entries in a dictionary",
    ],
    "strings": [
        "how do I work with text and strings in Python",
        "concatenating or joining strings together",
        "splitting a string into parts or words",
        "using f-strings or format() to insert values into text",
        "string methods like strip replace upper lower find",
        "checking if a string starts or ends with something",
        "strings are immutable, what does that mean",
        "multiline strings and escape characters",
    ],
    "modules": [
        "how do I import a module in Python",
        "what is the difference between a module and a package",
        "using the os sys math random or datetime module",
        "what does if __name__ == '__main__' mean",
        "how do I install a package with pip",
        "using from module import to get specific functions",
        "what is the Python standard library",
    ],
}


SYLLABUS_TOPICS = list(TOPIC_DESCRIPTIONS.keys())

# ── Pre-compute topic embeddings at import time ───────────────────────────────
# Each topic → mean embedding of all its descriptions, fetched from the HF
# hosted inference API (one batched call per topic) instead of a local
# torch/sentence-transformers model. This keeps the process lightweight
# enough to run on small hosting instances.

def _mean_vector(vectors):
    n = len(vectors)
    dim = len(vectors[0])
    out = [0.0] * dim
    for vec in vectors:
        for i in range(dim):
            out[i] += vec[i]
    return [v / n for v in out]


def _build_topic_embeddings() -> dict:
    topic_embeddings = {}
    for label, descriptions in TOPIC_DESCRIPTIONS.items():
        embeddings = get_embeddings(descriptions)
        topic_embeddings[label] = _mean_vector(embeddings)
    return topic_embeddings

_TOPIC_EMBEDDINGS = _build_topic_embeddings()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _cosine_sim(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _score_question(question: str) -> dict:
    """Return cosine similarity scores for every topic."""
    q_embedding = get_embedding(question.strip())
    return {
        label: round(_cosine_sim(q_embedding, vec), 4)
        for label, vec in _TOPIC_EMBEDDINGS.items()
    }


def detect_topic(question: str):
    """
    Detect which syllabus topic a question belongs to.
    Uses semantic similarity (via hosted HF embeddings) — no keyword lists, no regex.

    Args:
        question: raw student question string

    Returns:
        One of the SYLLABUS_TOPICS strings, or None if the question
        doesn't match any topic above _THRESHOLD.

    Examples:
        "how do I traverse a collection?"     → "loops"
        "what does RecursionError mean?"      → "recursion"
        "I want to store key-value pairs"     → "dictionaries"
        "what is the weather today?"          → None
    """
    if not question or not question.strip():
        return None

    scores = _score_question(question)
    best_label = max(scores, key=scores.get)

    return best_label if scores[best_label] >= _THRESHOLD else None


def is_on_syllabus(question: str) -> bool:
    """
    Broad check: is this question related to the Python syllabus at all?
    Used as a pre-filter before more specific processing.

    Returns True if any topic scores above _THRESHOLD.

    Examples:
        "how do I write a for loop?"   → True
        "who won the cricket match?"   → False
    """
    if not question or not question.strip():
        return False

    scores = _score_question(question)
    return max(scores.values()) >= _THRESHOLD


def detect_topic_with_scores(question: str) -> dict:
    """
    Same as detect_topic but returns all scores.
    Useful for debugging misclassifications or tuning _THRESHOLD.

    Example output:
    {
        "predicted": "loops",
        "scores": {
            "loops": 0.7321,
            "recursion": 0.3012,
            "functions": 0.4890,
            ...
        },
        "confidence": 0.7321,
        "on_syllabus": True
    }
    """
    if not question or not question.strip():
        return {"predicted": None, "scores": {}, "confidence": 0.0, "on_syllabus": False}

    scores = _score_question(question)
    best_label = max(scores, key=scores.get)
    confidence = scores[best_label]

    return {
        "predicted":   best_label if confidence >= _THRESHOLD else None,
        "scores":      scores,
        "confidence":  confidence,
        "on_syllabus": confidence >= _THRESHOLD,
    }
