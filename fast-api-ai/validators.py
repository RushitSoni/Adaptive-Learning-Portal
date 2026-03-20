def validate_question(question: str) -> str:
    if not isinstance(question, str):
        raise ValueError("Question must be a string.")

    question = question.strip()

    if not question:
        raise ValueError("Question cannot be empty.")

    if len(question) < 5:
        raise ValueError("Question is too short. Minimum 5 characters required.")

    if len(question) > 500:
        raise ValueError("Question is too long. Maximum 500 characters allowed.")

    return question