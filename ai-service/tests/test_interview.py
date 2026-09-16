from app.pipelines.interview import ats_score, evaluate_answer, generate_questions, retrieve_context

RESUME = {"skills": ["Python", "FastAPI", "Docker"], "experience": [{"title": "Engineer", "company": "Acme", "responsibilities": ["Built FastAPI services with Docker"]}]}

def test_retrieval_returns_relevant_resume_context():
    context = retrieve_context(RESUME, "Build Python FastAPI services with Docker")
    assert context and any("FastAPI" in item["content"] for item in context)

def test_question_generation_is_bounded_and_grounded():
    questions = generate_questions(RESUME, "Python platform engineer", 20)
    assert len(questions) == 10
    assert all(question["grounding"] for question in questions)

def test_ats_score_and_evaluation_have_safe_ranges():
    score = ats_score("alex@example.com Built and improved a Python service with measurable impact. " * 3, "Python service")
    evaluation = evaluate_answer("Describe a project", "I built a service because the team needed it. The result improved a metric by 20 percent.", [])
    assert 0 <= score["score"] <= 100
    assert 0 <= evaluation["score"] <= 100
