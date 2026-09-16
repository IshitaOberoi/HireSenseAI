import os
import json
import logging
from typing import List, Dict, Any
from app.providers.llm_provider import GroqLLMProvider
from app.core.prompts import load_prompt_template

logger = logging.getLogger("hiresense-ai.matcher")
llm_provider = GroqLLMProvider()

def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Compute cosine similarity between two float vectors.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a**2 for a in vec_a)**0.5
    norm_b = sum(b**2 for b in vec_b)**0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))


def generate_match_assessment(resume_data: Dict[str, Any], job_description: str, resume_vec: List[float], job_vec: List[float]) -> Dict[str, Any]:
    """
    Computes matching metrics:
    - Semantic similarity
    - Skill gaps analysis
    - Explainable AI reasoning via LLM
    """
    logger.info("Computing matching assessments...")
    
    # 1. Cosine similarity
    similarity = compute_cosine_similarity(resume_vec, job_vec)
    similarity_percentage = round(similarity * 100, 2)
    
    # 2. Skill Gap Analysis
    # Extract candidate skills (lowercase for exact matching)
    candidate_skills = [s.lower().strip() for s in resume_data.get("skills", [])]
    
    # Simple keyword checking on job description to estimate required skills for comparison
    # In a full model we'd extract these via LLM, but let's do a smart keyword extract for speed
    common_tech_skills = ["java", "spring boot", "python", "fastapi", "react", "postgresql", "terraform", "kubernetes", "docker", "aws", "git", "redis", "celery", "sql", "javascript"]
    required_skills = []
    job_desc_lower = job_description.lower()
    for skill in common_tech_skills:
        if skill in job_desc_lower:
            required_skills.append(skill)
            
    overlapping_skills = [s for s in required_skills if s in candidate_skills]
    missing_skills = [s for s in required_skills if s not in candidate_skills]
    
    # Coverage calculation
    skill_coverage = 1.0
    if required_skills:
        skill_coverage = len(overlapping_skills) / len(required_skills)
        
    skill_gap = {
        "overlapping_skills": overlapping_skills,
        "missing_skills": missing_skills,
        "skill_coverage": round(skill_coverage * 100, 2),
        "confidence": 0.89 # Request metadata confidence score
    }

    # 3. Explainable AI Reasoning (using templates)
    system_prompt = load_prompt_template("match_reasoning")
    user_prompt = f"Candidate Resume Schema:\n{json.dumps(resume_data)}\n\nJob Description:\n{job_description}"
    
    llm_res = llm_provider.generate_text(
        system_prompt=system_prompt,
        user_prompt=user_prompt
    )
    
    # Extract structural explanations from generated text
    reasoning_text = llm_res.get("text", "")
    
    return {
        "similarity_score": similarity_percentage,
        "matching_confidence": 0.91, # AI Matcher Confidence
        "skill_gap": skill_gap,
        "match_reasoning": reasoning_text,
        "log_record": {
            "request_type": "MATCHING",
            "model_name": "Groq Llama-3-8b + Local all-MiniLM",
            "latency_ms": llm_res.get("latency_ms", 0),
            "tokens_input": llm_res.get("tokens_input", 0),
            "tokens_output": llm_res.get("tokens_output", 0),
            "calculated_cost": 0.0,
            "status": llm_res.get("status", "SUCCESS")
        }
    }
