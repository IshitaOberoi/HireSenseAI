import re
from typing import Any, Dict, List, Optional
from app.pipelines.models import ParsedResumeSchema

MAX_CHUNK_CHARS = 1000

def _split_sentences(text: str, max_chars: int = MAX_CHUNK_CHARS) -> List[str]:
    """Splits text by sentence or word boundaries, accumulating units up to max_chars."""
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    sentences = re.split(r'(?<=[.!?])\s+', text)
    if len(sentences) <= 1:
        sentences = re.split(r'(?<=[;,])\s+', text)
    if len(sentences) <= 1:
        # Fallback to word boundaries
        words = text.split()
        chunks = []
        curr = []
        curr_len = 0
        for w in words:
            if curr_len + len(w) + (1 if curr else 0) <= max_chars:
                curr.append(w)
                curr_len += len(w) + (1 if len(curr) > 1 else 0)
            else:
                if curr:
                    chunks.append(" ".join(curr))
                curr = [w]
                curr_len = len(w)
        if curr:
            chunks.append(" ".join(curr))
        return chunks

    chunks = []
    current = []
    curr_len = 0
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if curr_len + len(s) + (1 if current else 0) <= max_chars:
            current.append(s)
            curr_len += len(s) + (1 if len(current) > 1 else 0)
        else:
            if current:
                chunks.append(" ".join(current))
            if len(s) > max_chars:
                # Sub-split oversized single sentence
                chunks.extend(_split_sentences(s, max_chars))
                current = []
                curr_len = 0
            else:
                current = [s]
                curr_len = len(s)
    if current:
        chunks.append(" ".join(current))
    return chunks

def _split_text_semantically(text: str, max_chars: int = MAX_CHUNK_CHARS) -> List[str]:
    """Splits text into semantic units respecting paragraph and sentence boundaries."""
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(paragraphs) > 1:
        chunks = []
        current = []
        curr_len = 0
        for p in paragraphs:
            if curr_len + len(p) + (2 if current else 0) <= max_chars:
                current.append(p)
                curr_len += len(p) + (2 if len(current) > 1 else 0)
            else:
                if current:
                    chunks.append("\n\n".join(current))
                if len(p) > max_chars:
                    chunks.extend(_split_sentences(p, max_chars))
                    current = []
                    curr_len = 0
                else:
                    current = [p]
                    curr_len = len(p)
        if current:
            chunks.append("\n\n".join(current))
        return chunks

    return _split_sentences(text, max_chars)

def chunk_resume(raw_text: str, parsed: Optional[ParsedResumeSchema] = None) -> List[Dict[str, Any]]:
    """
    Splits resume content into semantic, section-aware chunks.
    Preserves context units (e.g. role + achievements, education item, skills group)
    while strictly enforcing MAX_CHUNK_CHARS.
    """
    chunks: List[Dict[str, Any]] = []

    if parsed:
        # 1. Executive Summary
        if parsed.summary and parsed.summary.strip():
            summary = parsed.summary.strip()
            if len(summary) <= MAX_CHUNK_CHARS:
                chunks.append({
                    "section_name": "Executive Summary",
                    "content": summary
                })
            else:
                parts = _split_text_semantically(summary, MAX_CHUNK_CHARS)
                for p_idx, part in enumerate(parts):
                    label = f"Executive Summary (Part {p_idx + 1})" if len(parts) > 1 else "Executive Summary"
                    chunks.append({
                        "section_name": label,
                        "content": part
                    })

        # 2. Skills
        if parsed.skills:
            full_skills = f"Core Skills: {', '.join(parsed.skills)}."
            if len(full_skills) <= MAX_CHUNK_CHARS:
                chunks.append({
                    "section_name": "Skills",
                    "content": full_skills
                })
            else:
                curr_group = []
                curr_len = len("Core Skills: .")
                part_idx = 1
                for sk in parsed.skills:
                    if curr_len + len(sk) + 2 <= MAX_CHUNK_CHARS:
                        curr_group.append(sk)
                        curr_len += len(sk) + 2
                    else:
                        if curr_group:
                            chunks.append({
                                "section_name": f"Skills (Part {part_idx})",
                                "content": f"Core Skills: {', '.join(curr_group)}."
                            })
                            part_idx += 1
                        curr_group = [sk]
                        curr_len = len("Core Skills: .") + len(sk)
                if curr_group:
                    chunks.append({
                        "section_name": f"Skills (Part {part_idx})",
                        "content": f"Core Skills: {', '.join(curr_group)}."
                    })

        # 3. Work Experience entries
        for item in parsed.experience:
            comp = item.company or "Experience"
            role = item.title or "Role"
            dates = " — ".join(filter(None, [item.start_date, item.end_date]))
            header = f"{role} at {comp}"
            if dates:
                header += f" ({dates})"
            resp = " ".join(item.responsibilities) if item.responsibilities else ""
            full_entry = f"{header}. {resp}".strip()

            if len(full_entry) <= MAX_CHUNK_CHARS:
                if full_entry:
                    chunks.append({
                        "section_name": f"Experience: {comp}",
                        "content": full_entry
                    })
            else:
                header_prefix = f"{header}: "
                avail_chars = max(150, MAX_CHUNK_CHARS - len(header_prefix))
                if item.responsibilities:
                    curr_bullets = []
                    curr_len = 0
                    part_num = 1
                    for bullet in item.responsibilities:
                        bullet = bullet.strip()
                        if not bullet:
                            continue
                        if curr_len + len(bullet) + 1 <= avail_chars:
                            curr_bullets.append(bullet)
                            curr_len += len(bullet) + 1
                        else:
                            if curr_bullets:
                                chunks.append({
                                    "section_name": f"Experience: {comp} (Part {part_num})",
                                    "content": f"{header_prefix}{' '.join(curr_bullets)}"
                                })
                                part_num += 1
                            if len(bullet) > avail_chars:
                                sub_parts = _split_text_semantically(bullet, avail_chars)
                                for sp in sub_parts:
                                    chunks.append({
                                        "section_name": f"Experience: {comp} (Part {part_num})",
                                        "content": f"{header_prefix}{sp}"
                                    })
                                    part_num += 1
                                curr_bullets = []
                                curr_len = 0
                            else:
                                curr_bullets = [bullet]
                                curr_len = len(bullet)
                    if curr_bullets:
                        chunks.append({
                            "section_name": f"Experience: {comp} (Part {part_num})",
                            "content": f"{header_prefix}{' '.join(curr_bullets)}"
                        })
                else:
                    sub_parts = _split_text_semantically(resp, avail_chars)
                    for p_idx, sp in enumerate(sub_parts):
                        chunks.append({
                            "section_name": f"Experience: {comp} (Part {p_idx + 1})",
                            "content": f"{header_prefix}{sp}"
                        })

        # 4. Education entries
        for item in parsed.education:
            inst = item.institution or "Education"
            deg_major = " in ".join(filter(None, [item.degree, item.major]))
            dates = " — ".join(filter(None, [item.start_date, item.end_date]))
            content_parts = [inst]
            if deg_major:
                content_parts.append(deg_major)
            if dates:
                content_parts.append(f"({dates})")
            full_edu = " · ".join(content_parts)
            if len(full_edu) <= MAX_CHUNK_CHARS:
                chunks.append({
                    "section_name": f"Education: {inst}",
                    "content": full_edu
                })
            else:
                sub_parts = _split_text_semantically(full_edu, MAX_CHUNK_CHARS)
                for p_idx, sp in enumerate(sub_parts):
                    chunks.append({
                        "section_name": f"Education: {inst} (Part {p_idx + 1})",
                        "content": sp
                    })

        # 5. Projects
        for item in parsed.projects:
            title = item.title or "Project"
            tech = f" Technologies: {', '.join(item.technologies)}." if item.technologies else ""
            content = f"Project {title}: {item.description or ''}.{tech}".strip()
            if len(content) <= MAX_CHUNK_CHARS:
                chunks.append({
                    "section_name": f"Project: {title}",
                    "content": content
                })
            else:
                prefix = f"Project {title}: "
                avail = max(150, MAX_CHUNK_CHARS - len(prefix) - len(tech))
                desc_parts = _split_text_semantically(item.description or "", avail)
                for p_idx, dp in enumerate(desc_parts):
                    suffix = tech if p_idx == len(desc_parts) - 1 else ""
                    chunks.append({
                        "section_name": f"Project: {title} (Part {p_idx + 1})",
                        "content": f"{prefix}{dp}.{suffix}".strip()
                    })

        # 6. Certifications
        if parsed.certifications:
            full_certs = f"Certifications: {', '.join(parsed.certifications)}."
            if len(full_certs) <= MAX_CHUNK_CHARS:
                chunks.append({
                    "section_name": "Certifications",
                    "content": full_certs
                })
            else:
                sub_parts = _split_text_semantically(full_certs, MAX_CHUNK_CHARS)
                for p_idx, sp in enumerate(sub_parts):
                    chunks.append({
                        "section_name": f"Certifications (Part {p_idx + 1})",
                        "content": sp
                    })

    # If structured fields yielded fewer than 2 chunks, supplement/fallback with raw text sectioning
    if len(chunks) < 2 and raw_text and raw_text.strip():
        raw_chunks = chunk_raw_text(raw_text)
        if raw_chunks:
            chunks = raw_chunks

    # Assign sequential chunk indices
    for idx, c in enumerate(chunks):
        c["chunk_index"] = idx

    return chunks

def chunk_raw_text(text: str) -> List[Dict[str, Any]]:
    """Fallback section chunker using header detection and paragraph boundaries."""
    sections = re.split(r'\n(?=[A-Z\s]{3,25}:?\n)', text.strip())
    chunks = []

    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        lines = sec.split('\n', 1)
        header = lines[0].strip(': \t')
        body = lines[1].strip() if len(lines) > 1 else ""

        section_name = header.title() if len(header) <= 40 else "Resume Section"
        full_content = sec if len(lines) == 1 else f"{header}: {body}"

        if len(full_content) <= MAX_CHUNK_CHARS:
            chunks.append({
                "section_name": section_name,
                "content": full_content
            })
        else:
            sub_parts = _split_text_semantically(full_content, MAX_CHUNK_CHARS)
            for sp in sub_parts:
                chunks.append({
                    "section_name": section_name,
                    "content": sp
                })

    if not chunks:
        sub_parts = _split_text_semantically(text.strip(), MAX_CHUNK_CHARS)
        for sp in sub_parts:
            chunks.append({
                "section_name": "Resume Content",
                "content": sp
            })

    return chunks
