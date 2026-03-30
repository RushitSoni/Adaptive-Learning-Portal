import re


TOPIC_KEYWORDS = {
    # Most specific topics first to avoid wrong matches
    "loops": [
        "for loop", "while loop", "for in", "while true",
        "iterate", "iteration", "iterating",
        "break", "continue", "nested loop", "infinite loop",
        "list iteration", "looping", "enumerate", "zip",
        "range(", "loop variable", "repeat"
    ],
    "recursion": [
        "recursion", "recursive", "base case", "call stack",
        "factorial", "fibonacci", "recurse", "stack overflow",
        "recursive function", "self call", "recursionerror",
        "memoization", "lru_cache"
    ],
    "exceptions": [
        "exception", "try", "except", "finally", "raise",
        "valueerror", "typeerror", "indexerror", "keyerror",
        "attributeerror", "zerodivisionerror", "filenotfounderror",
        "custom exception", "exception handling", "catch",
        "runtime error", "traceback", "error handling"
    ],
    "functions": [
        "function", "def", "return statement", "lambda",
        "parameter", "argument", "default argument",
        "keyword argument", "positional argument",
        "args", "kwargs", "docstring", "higher order",
        "closure", "anonymous function", "function call",
        "local variable", "global variable", "scope",
        "return value"
    ],
    "oop": [
        "class", "object", "inheritance", "polymorphism",
        "oop", "oops", "encapsulation", "abstraction",
        "__init__", "self parameter", "method", "instance",
        "constructor", "super()", "subclass", "parent class",
        "child class", "override", "overriding", "classmethod",
        "staticmethod", "__str__", "__repr__", "dunder",
        "magic method", "object oriented", "instantiate"
    ],
    "variables": [
        "variable", "data type", "integer", "float type",
        "boolean", "type conversion", "casting", "int(",
        "str(", "float(", "bool(", "none", "null",
        "assignment", "dynamic typing", "type()", "isinstance",
        "arithmetic", "operator", "modulus", "floor division"
    ],
    "lists": [
        "list", "append", "extend", "insert", "remove",
        "pop(", "slice", "slicing", "list comprehension",
        "nested list", "2d list", "array", "index",
        "sort(", "reverse(", "in operator", "unpack"
    ],
    "dictionaries": [
        "dictionary", "dict", "key value", "key-value",
        "keys()", "values()", "items()", "get(",
        "nested dict", "dict comprehension", "hashmap",
        "setdefault", "update("
    ],
    "strings": [
        "string", "substring", "concatenate", "split(",
        "join(", "strip(", "replace(", "upper(", "lower(",
        "f-string", "format(", "find(", "startswith",
        "endswith", "string method", "immutable string",
        "multiline string", "escape character", "raw string"
    ],
    "modules": [
        "import", "module", "package", "from import",
        "os module", "sys module", "math module",
        "random module", "datetime", "__name__", "__main__",
        "pip", "standard library", "library"
    ],
}

SYLLABUS_TOPICS = list(TOPIC_KEYWORDS.keys())


def detect_topic(question: str) -> str | None:
    """
    Detect which syllabus topic a question belongs to.
    Uses word-boundary regex matching to avoid false partial matches
    e.g. "for" inside "information" or "performance".
    Returns the topic name or None if not matched.
    """
    question_lower = question.lower()

    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            # Word boundary match — prevents "for" matching "information"
            pattern = r'\b' + re.escape(keyword.strip()) + r'\b'
            if re.search(pattern, question_lower):
                return topic

    return None


def is_on_syllabus(question: str) -> bool:
    """
    Broad check: is this question related to Python at all?
    Used as a pre-filter before topic detection.
    """
    python_signals = [
        "python", "code", "program", "syntax", "script",
        "output", "print", "debug", "run", "error",
        "write a", "how to", "what is", "explain", "example"
    ]

    question_lower = question.lower()

    # If topic is detected, it's definitely on syllabus
    if detect_topic(question) is not None:
        return True

    # Otherwise check for generic Python signals
    return any(signal in question_lower for signal in python_signals)