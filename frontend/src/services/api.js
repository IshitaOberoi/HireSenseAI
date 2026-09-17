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

  askResumeQuestion: async (resumeId, question) => {
    const res = await fetch(`${API_BASE}/candidates/resumes/${resumeId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to ask question about resume");
    return res.json();
  },

  matchJobDescription: async (resumeId, jobDescription) => {
    const res = await fetch(`${API_BASE}/candidates/resumes/${resumeId}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Job match failed");
    return res.json();
  },

  getJobMatchesForResume: async (resumeId) => {
    const res = await fetch(`${API_BASE}/candidates/resumes/${resumeId}/matches`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to fetch matches");
    return res.json();
  },

  // Candidate Dashboard, Roadmap & Profile APIs
  getCandidateDashboard: async (candidateId) => {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/dashboard`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to fetch dashboard data");
    return res.json();
  },

  getCandidateRoadmap: async (candidateId) => {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/roadmap`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to fetch roadmap data");
    return res.json();
  },

  getCandidateProfile: async (candidateId) => {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/profile`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to fetch candidate profile");
    return res.json();
  },

  updateCandidateProfile: async (candidateId, profileData) => {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to update profile");
    return res.json();
  },

  // Recruiter Job APIs
  getRecruiterJobs: async () => {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error("Failed to fetch recruiter jobs");
    return res.json();
  },

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
