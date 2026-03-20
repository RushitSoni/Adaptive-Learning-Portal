TOPIC_KEYWORDS = {
    "exceptions": ["exception", "try", "except", "finally", "error"],
    "recursion": ["recursion", "recursive", "base case", "call stack"],
    "oop": ["class", "object", "inheritance", "polymorphism","oop","oops"],
    "functions":["functions","function"],
    "loops":["loops"]
}

def detect_topic(question: str):
    question_lower = question.lower()

    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            if keyword in question_lower:
                return topic

    return None