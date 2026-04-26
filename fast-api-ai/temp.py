"""
Test script for RL query type classifier
Run: python test_query_classifier.py
"""

from rl_policy import classify_query_type_for_rl  # 👈 change this import

# ─── Test Dataset ───────────────────────────────────────────────
TEST_CASES = [
    # ── DEBUG ──
    ("My code is not working, can you fix it?", "debug"),
    ("I am getting error in recursion function", "debug"),
    ("Why is this code throwing exception?", "debug"),

    # ── COMPARE ──
    ("What is difference between list and tuple?", "compare"),
    ("Which is better, list or set?", "compare"),
    ("Compare recursion vs iteration", "compare"),

    # ── APPLICATION ──
    ("How to implement binary search in python?", "application"),
    ("Write a program to reverse a string", "application"),
    ("How do I build a REST API?", "application"),

    # ── CONCEPTUAL ──
    ("What is recursion?", "conceptual"),
    ("Explain OOP in python", "conceptual"),
    ("What are decorators?", "conceptual"),
]


# ─── Run Tests ──────────────────────────────────────────────────
def run_tests():
    correct = 0
    total = len(TEST_CASES)

    print("\n🔍 Running Query Classification Tests...\n")

    for i, (question, expected) in enumerate(TEST_CASES, 1):
        predicted = classify_query_type_for_rl(question)

        status = "✅" if predicted == expected else "❌"

        if predicted == expected:
            correct += 1

        print(f"{i}. {status}")
        print(f"   Question  : {question}")
        print(f"   Expected  : {expected}")
        print(f"   Predicted : {predicted}\n")

    accuracy = (correct / total) * 100

    print("────────────────────────────────────────")
    print(f"🎯 Accuracy: {accuracy:.2f}% ({correct}/{total})")
    print("────────────────────────────────────────")


# ─── Entry Point ────────────────────────────────────────────────
if __name__ == "__main__":
    run_tests()