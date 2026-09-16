"""Recorded-audio interview analysis. No live copilot or WebRTC transport."""
from __future__ import annotations
import re
from typing import Any

SKILL_KEYWORDS = ("python", "java", "react", "spring", "fastapi", "sql", "docker", "aws", "redis", "kubernetes")

def retrieve_context(resume: dict[str, Any], job_description: str, limit: int = 4) -> list[dict[str, str]]:
    """Lightweight deterministic retrieval over parsed resume sections for grounded prompts."""
    query = set(re.findall(r"[a-z+#.]+", job_description.lower()))
    chunks: list[tuple[str, str]] = []
    for skill in resume.get("skills", []):
        chunks.append((str(skill), f"Candidate skill: {skill}"))
    for experience in resume.get("experience", []):
        text = " ".join([str(experience.get("title", "")), str(experience.get("company", "")), *experience.get("responsibilities", [])])
        chunks.append((text, f"Experience: {text}"))
    scored = sorted(chunks, key=lambda item: len(query & set(re.findall(r"[a-z+#.]+", item[0].lower()))), reverse=True)
    return [{"source": "resume", "content": text} for _, text in scored[:limit] if text]

def generate_questions(resume: dict[str, Any], job_description: str, count: int = 5) -> list[dict[str, Any]]:
    context = retrieve_context(resume, job_description)
    skills = resume.get("skills", []) or ["your core technical experience"]
    technical = skills[:3] + ["system design", "problem solving"]
    questions = []
    for index in range(min(max(count, 1), 10)):
        topic = technical[index % len(technical)]
        kind = "behavioral" if index < 2 else "technical"
        questions.append({
            "id": f"q-{index + 1}", "type": kind, "topic": topic,
            "question": (f"Tell me about a time you used {topic} to overcome a difficult delivery challenge."
                         if kind == "behavioral" else f"How would you apply {topic} to the requirements in this role?"),
            "evaluation_guide": "Look for a structured answer, concrete trade-offs, measurable impact, and relevance to the role.",
            "grounding": context[:2],
        })
    return questions

def ats_score(raw_text: str, job_description: str = "") -> dict[str, Any]:
    normalized = raw_text.strip()
    words = re.findall(r"\w+", normalized)
    issues, strengths = [], []
    if len(words) < 80: issues.append("Resume contains limited extractable text.")
    else: strengths.append("Resume contains sufficient extractable text.")
    if not re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", normalized): issues.append("No email address was detected.")
    else: strengths.append("Contact email detected.")
    action_verbs = {"built", "led", "developed", "improved", "designed", "delivered", "implemented", "optimized"}
    verb_count = sum(word.lower() in action_verbs for word in words)
    if verb_count < 2: issues.append("Add action verbs and measurable accomplishments.")
    else: strengths.append("Achievement-oriented language detected.")
    matched = [skill for skill in SKILL_KEYWORDS if skill in normalized.lower() and skill in job_description.lower()]
    score = max(0, min(100, 55 + len(strengths) * 12 + min(verb_count, 5) * 3 + len(matched) * 4 - len(issues) * 10))
    return {"score": score, "parseability": "high" if len(issues) < 2 else "needs_attention", "strengths": strengths, "issues": issues, "matched_job_keywords": matched}

def evaluate_answer(question: str, transcript: str, context: list[dict[str, str]]) -> dict[str, Any]:
    words = re.findall(r"\w+", transcript)
    lowered = transcript.lower()
    evidence = sum(term in lowered for term in ("because", "result", "impact", "metric", "trade-off", "team"))
    score = max(0, min(100, 35 + min(len(words), 180) // 4 + evidence * 6))
    feedback = []
    if len(words) < 35: feedback.append("Give a fuller answer using situation, action, and result.")
    if evidence < 2: feedback.append("Include concrete outcomes, metrics, or trade-offs.")
    if not feedback: feedback.append("Strong level of detail and evidence; keep connecting choices to the role.")
    return {"score": score, "question": question, "transcript": transcript, "feedback": feedback, "grounding_used": context[:2]}
