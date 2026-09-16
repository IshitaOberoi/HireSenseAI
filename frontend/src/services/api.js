const API_BASE = "http://localhost:8080/api";
const AI_BASE = import.meta.env.VITE_AI_API_URL || "http://localhost:8000/api/ai";

async function aiRequest(path, payload) {
  const res = await fetch(`${AI_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'AI request failed');
  return res.json();
}

export const apiService = {
  // Candidate APIs
  uploadResume: async (file, candidateId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidateId', candidateId);
    
    const res = await fetch(`${API_BASE}/candidates/resume/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload failed");
    return res.json();
  },

  getResumes: async (candidateId) => {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/resumes`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to fetch resumes");
    return res.json();
  },

  // Recruiter Job APIs
  createJob: async (jobData) => {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });
    if (!res.ok) throw new Error("Job creation failed");
    return res.json();
  },

  getJobMatches: async (jobId) => {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/matches`);
    if (!res.ok) throw new Error("Failed to fetch matches");
    return res.json();
  },
  scoreAts: (resume_text, job_description) => aiRequest('/ats/score', { resume_text, job_description }),
  generateInterviewQuestions: (resume_json, job_description) => aiRequest('/interviews/questions', { resume_json, job_description }),
  evaluateInterviewAnswer: (question, transcript, context) => aiRequest('/interviews/evaluate', { question, transcript, context }),
  transcribeRecording: async (audio) => {
    const body = new FormData(); body.append('audio', audio);
    const res = await fetch(`${AI_BASE}/interviews/transcribe`, { method: 'POST', body });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Transcription failed');
    return res.json();
  }
};
