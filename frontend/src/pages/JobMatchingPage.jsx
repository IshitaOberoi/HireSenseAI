import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { apiService } from '../services/api';

const candidateId = import.meta.env.VITE_DEV_CANDIDATE_ID || '11111111-1111-1111-1111-111111111111';

const SAMPLE_JDS = [
  {
    title: "Senior Distributed Systems Engineer",
    company: "CloudFlow Systems",
    text: `CloudFlow Systems is seeking a Senior Distributed Systems Engineer to lead the architecture and scaling of our core event processing infrastructure.

Responsibilities:
- Architect, build, and optimize high-throughput streaming pipelines processing 200M+ events daily.
- Design fault-tolerant microservices using Java and Spring Boot.
- Implement streaming and messaging infrastructure using Apache Kafka and PostgreSQL.
- Ensure database performance, vector search capabilities, and sub-second query latency.
- Collaborate with infrastructure teams on container deployment with Docker and Kubernetes.

Requirements:
- 5+ years of software engineering experience with distributed systems.
- Strong proficiency in Java, Spring Boot, and Apache Kafka.
- Deep relational database experience with PostgreSQL and SQL query optimization.
- Proven experience with Docker and Kubernetes container orchestration.
- Preferred: Experience with Redis caching, pgvector, and cloud infrastructure (AWS/GCP).`
  },
  {
    title: "Full Stack Engineer (AI Platform)",
    company: "Nexus AI",
    text: `Nexus AI is hiring a Full Stack Engineer to build next-generation developer tooling for AI agent workflows.

Responsibilities:
- Build high-performance, reactive user interfaces with React and Tailwind CSS.
- Develop robust RESTful microservices and AI orchestration pipelines using Python and FastAPI.
- Integrate vector search and retrieval-augmented generation (RAG) using PostgreSQL with pgvector.
- Deploy and monitor distributed services using Docker and Redis task queues.

Requirements:
- 3+ years of full-stack development experience.
- Strong expertise with React, JavaScript/TypeScript, and modern frontend architecture.
- Hands-on experience with Python, FastAPI, and asynchronous backend services.
- Experience with relational databases (PostgreSQL).
- Preferred: Familiarity with LLM APIs (Groq, OpenAI), Celery, and pgvector embeddings.`
  }
];

function alignmentTone(rating) {
  if (rating === 'Strong Match') return 'success';
  if (rating === 'Good Match') return 'info';
  if (rating === 'Moderate Match') return 'warning';
  return 'danger';
}

export default function JobMatchingPage() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [pastMatches, setPastMatches] = useState([]);
  const [error, setError] = useState('');

  const loadResumes = useCallback(async () => {
    setLoadingResumes(true);
    setError('');
    try {
      const data = await apiService.getResumes(candidateId);
      const completed = (data || []).filter(r => r.processingStatus === 'COMPLETED');
      setResumes(completed);
      if (completed.length > 0) {
        setSelectedResumeId(completed[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load resumes');
    } finally {
      setLoadingResumes(false);
    }
  }, []);

  const loadPastMatches = useCallback(async (resumeId) => {
    if (!resumeId) return;
    try {
      const matches = await apiService.getJobMatchesForResume(resumeId);
      setPastMatches(matches || []);
    } catch (err) {
      console.warn('Could not load past matches:', err);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  useEffect(() => {
    if (selectedResumeId) {
      loadPastMatches(selectedResumeId);
    }
  }, [selectedResumeId, loadPastMatches]);

  const handleMatch = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResumeId) {
      setError('Select an analyzed resume first.');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 10) {
      setError('Job description must be at least 10 characters.');
      return;
    }

    setMatching(true);
    setError('');
    try {
      const result = await apiService.matchJobDescription(selectedResumeId, jobDescription.trim());
      setMatchResult(result);
      loadPastMatches(selectedResumeId);
    } catch (err) {
      setError(err.message || 'Job matching failed.');
    } finally {
      setMatching(false);
    }
  };

  const fillSampleJd = (sample) => {
    setJobDescription(sample.text);
    setError('');
  };

  if (loadingResumes) {
    return <LoadingState label="Loading candidate resume profiles..." />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
          <p className="hs-caption uppercase tracking-[0.14em] text-emerald-400 font-semibold">
            Deterministic Semantic Matching
          </p>
        </div>
        <h1 className="hs-heading mt-1">Semantic Job Matching</h1>
        <p className="mt-1 text-sm text-slate-400">
          Match your structured resume against any job description using 384D pgvector cosine similarity, normalized skill overlap, and strictly grounded LLM explanation.
        </p>
      </div>

      {/* Resume Selector & Input Form */}
      {resumes.length === 0 ? (
        <EmptyState
          title="No Analyzed Resumes Found"
          description="You must have at least one successfully completed resume analysis to run job matching. Please upload and analyze a resume first."
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
              <div>
                <h2 className="hs-title">Target Job Description</h2>
                <p className="mt-1 hs-caption text-slate-400">
                  Select your resume and paste any target job description.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="resume-select" className="text-xs font-medium text-slate-400 whitespace-nowrap">
                  Candidate Resume:
                </label>
                <select
                  id="resume-select"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-emerald-400 focus:outline-none"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fileName} (ID: {r.id.substring(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Quick Fill Samples */}
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Quick load realistic role:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_JDS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => fillSampleJd(sample)}
                    className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-slate-300 hover:border-emerald-400/40 hover:bg-emerald-400/10 transition-colors"
                  >
                    + {sample.title} ({sample.company})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleMatch} className="space-y-4">
              <textarea
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job description requirements, responsibilities, and qualifications..."
                className="w-full rounded-lg border border-white/[0.14] bg-hs-canvas p-3 text-xs leading-5 text-slate-200 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />

              {error && (
                <p role="alert" className="text-xs text-red-300">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={matching}
                  disabled={matching || !selectedResumeId || jobDescription.trim().length < 10}
                >
                  {matching ? 'Analyzing Match...' : 'Analyze Job Match'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Match Result Display */}
      {matchResult && (
        <div className="space-y-5">
          {/* Match Score Hero Card */}
          <Card className="border-emerald-500/30 shadow-xl">
            <CardHeader>
              <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="hs-caption uppercase tracking-[0.14em] text-emerald-400 font-semibold">
                    Match Evaluation Result
                  </p>
                  <h1 className="hs-heading mt-1">
                    {matchResult.jobTitle || 'Role Evaluation'}
                  </h1>
                  {matchResult.company && (
                    <p className="mt-1 text-sm text-slate-400">at {matchResult.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={alignmentTone(matchResult.alignmentRating)}>
                    {matchResult.alignmentRating}
                  </Badge>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-emerald-400">
                      {matchResult.matchScore.toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Composite Score</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Required Skill Coverage */}
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Required Skills</span>
                    <span className="text-[10px] text-slate-500">wt: 40%</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-100">
                    {((matchResult.scoreBreakdown?.requiredSkillCoverage || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {matchResult.skillsAnalysis?.matched?.length || 0} of {matchResult.skillsAnalysis?.required?.length || 0} skills matched
                  </p>
                </div>

                {/* Semantic Similarity */}
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Semantic Similarity</span>
                    <span className="text-[10px] text-slate-500">wt: 30%</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-sky-400">
                    {(matchResult.scoreBreakdown?.semanticSimilarity || 0).toFixed(4)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    384D pgvector cosine similarity
                  </p>
                </div>

                {/* Preferred Skill Coverage */}
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Preferred Skills</span>
                    <span className="text-[10px] text-slate-500">wt: 15%</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-100">
                    {((matchResult.scoreBreakdown?.preferredSkillCoverage || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {matchResult.skillsAnalysis?.matchedPreferred?.length || 0} of {matchResult.skillsAnalysis?.preferred?.length || 0} skills matched
                  </p>
                </div>

                {/* Evidence Relevance */}
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Evidence Relevance</span>
                    <span className="text-[10px] text-slate-500">wt: 15%</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-purple-400">
                    {(matchResult.scoreBreakdown?.evidenceRelevance || 0).toFixed(4)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Top qualifying resume chunks
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Grounded Explanation ("Why You're a Match") */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="hs-title">Why You're a Match</h2>
                  <p className="mt-1 hs-caption text-slate-400">
                    Grounded AI analysis synthesized directly from your verified resume evidence.
                  </p>
                </div>
                {matchResult.metadata?.model && (
                  <Badge tone="info">
                    {matchResult.metadata.model} · {matchResult.metadata.latency_ms || 0}ms
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <div className="rounded-lg border border-white/[0.08] bg-hs-canvas p-4 text-xs leading-6 text-slate-300 whitespace-pre-line">
                {matchResult.explanation}
              </div>
            </CardBody>
          </Card>

          {/* Skills Breakdown Grid */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Required Skills Analysis */}
            <Card>
              <CardHeader>
                <h2 className="hs-title">Required Competencies</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-2">
                    ✓ Verified In Resume ({matchResult.skillsAnalysis?.matched?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.skillsAnalysis?.matched?.length ? (
                      matchResult.skillsAnalysis.matched.map((skill, idx) => (
                        <Badge key={idx} tone="success">{skill}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None identified</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-2">
                    ✗ Missing Or Unspecified ({matchResult.skillsAnalysis?.missing?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.skillsAnalysis?.missing?.length ? (
                      matchResult.skillsAnalysis.missing.map((skill, idx) => (
                        <Badge key={idx} tone="warning">{skill}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No missing required skills</span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Preferred Skills Analysis */}
            <Card>
              <CardHeader>
                <h2 className="hs-title">Preferred & Bonus Skills</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-sky-400 mb-2">
                    ✓ Bonus Qualifications Met ({matchResult.skillsAnalysis?.matchedPreferred?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.skillsAnalysis?.matchedPreferred?.length ? (
                      matchResult.skillsAnalysis.matchedPreferred.map((skill, idx) => (
                        <Badge key={idx} tone="info">{skill}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No preferred skills matched</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    ○ Unmet Bonus Skills ({matchResult.skillsAnalysis?.missingPreferred?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.skillsAnalysis?.missingPreferred?.length ? (
                      matchResult.skillsAnalysis.missingPreferred.map((skill, idx) => (
                        <Badge key={idx} tone="neutral">{skill}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Verified Resume Evidence */}
          {matchResult.evidence && matchResult.evidence.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <h2 className="hs-title">Retrieved Resume Evidence</h2>
                  <p className="mt-1 hs-caption text-slate-400">
                    Highest-similarity resume chunks retrieved from pgvector to ground the match evaluation.
                  </p>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {matchResult.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/[0.08] bg-hs-canvas p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        {ev.sectionName}
                      </span>
                      <Badge tone="info">
                        Similarity: {ev.similarity.toFixed(4)}
                      </Badge>
                    </div>
                    <p className="text-xs leading-5 text-slate-400">
                      "{ev.excerpt}"
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Past Matches Section */}
      {pastMatches.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="hs-title">Previous Role Evaluations</h2>
              <p className="mt-1 hs-caption text-slate-400">
                Match history for the selected resume.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {pastMatches.map((m) => (
              <div
                key={m.id}
                onClick={() => setMatchResult(m)}
                className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {m.jobTitle} {m.company ? `(${m.company})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Evaluation ID: {m.id?.substring(0, 8)}...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={alignmentTone(m.alignmentRating)}>
                    {m.alignmentRating}
                  </Badge>
                  <span className="text-sm font-bold text-emerald-400">
                    {m.matchScore?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
