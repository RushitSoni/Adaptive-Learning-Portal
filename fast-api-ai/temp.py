# test_integration.py  — run against a live dev server
import requests

BASE = "http://localhost:8000"

# 1. Create student
r = requests.post(f"{BASE}/student", json={"name": "Test Student"})
sid = r.json()["student_id"]

# 2. Start session (Quiz1 score = 40)
requests.post(f"{BASE}/student/{sid}/start-session",
    json={"topic": "loops", "quiz1_score": 40.0, "difficulty": "easy"})

# 3. Ask a doubt — check strategy is returned
r = requests.post(f"{BASE}/chat", json={
    "question": "why is my for loop not working?",
    "student_id": sid
})
body = r.json()
assert "strategy_used" in body
assert body["strategy_used"] is not None
print(f"Strategy chosen: {body['strategy_used']}")      # first time = cold start
print(f"RL metadata: {body['rl_metadata']}")

# 4. BKT update — student answered 3 MCQs (2 correct, 1 wrong)
requests.post(f"{BASE}/student/{sid}/bkt-bulk-update", json={
    "topic": "loops",
    "mcq_results": [True, True, False],
    "code_io_results": [True],
    "coding_scores": [70.0]
})

# 5. Check mastery
r = requests.get(f"{BASE}/student/{sid}/mastery/loops")
print(f"P(mastery): {r.json()['p_mastery']}")

# 6. Record Quiz2 score — should trigger Q-table update
r = requests.post(f"{BASE}/student/{sid}/record-quiz",
    json={"topic": "loops", "score": 68.0, "difficulty": "easy"})
print(f"RL session update: {r.json()['rl_session_update']}")

# 7. Ask another doubt — now Q-table has data, no cold start
r = requests.post(f"{BASE}/chat", json={
    "question": "how does a while loop work?",
    "student_id": sid
})
meta = r.json()["rl_metadata"]
assert meta["cold_start"] == False     # Q-table learned something
print(f"Second strategy: {r.json()['strategy_used']}")
print("Integration tests passed ✅")