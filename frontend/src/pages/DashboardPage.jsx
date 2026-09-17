import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { apiService } from '../services/api';

const candidateId = import.meta.env.VITE_DEV_CANDIDATE_ID || '11111111-1111-1111-1111-111111111111';

function alignmentTone(score) {
  if (score >= 80) return 'success';
  if (score >= 65) return 'info';
  if (score >= 50) return 'warning';
  return 'danger';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getCandidateDashboard(candidateId);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <LoadingState label="Loading Candidate Command Center…" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={loadDashboard}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { candidate, resumeSummary, matchingSummary, insight } = data || {};
  const hasResumes = resumeSummary && resumeSummary.totalResumes > 0;
  const hasMatches = matchingSummary && matchingSummary.totalMatches > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="hs-caption font-semibold uppercase tracking-wider text-sky-400">
            Candidate Command Center
          </span>
          <h1 className="hs-heading mt-1 text-2xl font-bold text-white sm:text-3xl">
            Welcome back, {candidate?.name || 'Candidate'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time intelligence from your verified resume documents and target job evaluations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/resume')}>
            Manage Resumes
          </Button>
          <Button size="sm" onClick={() => navigate('/jobs')}>
            Evaluate New Role
          </Button>
        </div>
      </div>

      {/* Grounded Insight Banner */}
      {insight && (
        <section
          aria-label="Intelligence Insight"
          className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-300">
              💡
            </span>
            <div>
              <h2 className="text-sm font-semibold text-sky-200">
                {insight.headline}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {insight.message}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Resume */}
        <Card interactive onClick={() => navigate('/resume')}>
          <CardBody className="p-5">
            <p className="hs-caption text-slate-400">Active Resume</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {hasResumes ? resumeSummary.latestFileName : 'None'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone={hasResumes && resumeSummary.latestStatus === 'COMPLETED' ? 'success' : 'warning'}>
                {hasResumes ? resumeSummary.latestStatus : 'Needs Upload'}
              </Badge>
              {hasResumes && resumeSummary.atsScore > 0 && (
                <span className="hs-caption text-slate-400">
                  Health: {resumeSummary.atsScore}/100
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Top Match Score */}
        <Card interactive onClick={() => navigate('/jobs')}>
          <CardBody className="p-5">
            <p className="hs-caption text-slate-400">Top Match Score</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {hasMatches ? `${matchingSummary.topScore}%` : '—'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {hasMatches ? (
                <Badge tone={alignmentTone(matchingSummary.topScore)}>
                  {matchingSummary.topScore >= 80 ? 'Strong Match' : 'Evaluated'}
                </Badge>
              ) : (
                <span className="hs-caption text-slate-500">0 matches evaluated</span>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Average Match Score */}
        <Card interactive onClick={() => navigate('/jobs')}>
          <CardBody className="p-5">
            <p className="hs-caption text-slate-400">Average Match Score</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {hasMatches ? `${matchingSummary.averageScore}%` : '—'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="hs-caption text-slate-400">
                {matchingSummary?.totalMatches || 0} total evaluated
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Identified Skill Gaps */}
        <Card interactive onClick={() => navigate('/roadmap')}>
          <CardBody className="p-5">
            <p className="hs-caption text-slate-400">Identified Skill Gaps</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {matchingSummary?.topSkillGaps?.length || 0}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="hs-caption text-sky-400">
                View Career Roadmap →
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid: Recent Matches & Right Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Matches & Progress Tracker */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Matches Table */}
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title text-base font-semibold text-white">Recent Job Evaluations</h2>
                <p className="mt-0.5 hs-caption text-slate-400">
                  Target roles semantically evaluated against your active resume.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
                View all in Jobs
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              {hasMatches ? (
                <div className="divide-y divide-white/[0.06]">
                  {matchingSummary.recentMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center hover:bg-white/[0.02]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{match.jobTitle}</h3>
                          {match.company && (
                            <span className="text-xs text-slate-400">· {match.company}</span>
                          )}
                        </div>
                        <p className="hs-caption text-slate-500">
                          Evaluated {new Date(match.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-bold text-white">{match.matchScore}%</span>
                          <span className="block text-xs">
                            <Badge tone={alignmentTone(match.matchScore)}>
                              {match.alignmentRating}
                            </Badge>
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/jobs?resumeId=${match.resumeId}`)}
                        >
                          Inspect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-400">No job matches evaluated yet.</p>
                  <p className="mt-1 hs-caption text-slate-500">
                    Paste a job description on the Jobs page to run a grounded semantic match.
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => navigate('/jobs')}>
                    Run First Job Match
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Career Journey Checklist */}
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title text-base font-semibold text-white">Career Readiness Checklist</h2>
                <p className="mt-0.5 hs-caption text-slate-400">
                  Track your progress from raw document to interview readiness.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${hasResumes ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/[0.08] text-slate-400'}`}>
                    {hasResumes ? '✓' : '1'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Resume Parsed & Structured</p>
                    <p className="hs-caption text-slate-400">
                      {hasResumes
                        ? `Verified baseline from ${resumeSummary.latestFileName} with ${resumeSummary.totalResumes} uploaded resume(s).`
                        : 'Upload your latest PDF or DOCX resume to extract verified capabilities.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${hasMatches ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/[0.08] text-slate-400'}`}>
                    {hasMatches ? '✓' : '2'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Semantic Job Alignment Evaluated</p>
                    <p className="hs-caption text-slate-400">
                      {hasMatches
                        ? `Completed ${matchingSummary.totalMatches} role evaluations with pgvector semantic similarity.`
                        : 'Evaluate target job descriptions to identify exact skill gaps and strengths.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-300">
                    3
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">Career Roadmap & Gap Bridging</p>
                      <Link to="/roadmap" className="text-xs text-sky-400 hover:underline">
                        Explore Roadmap →
                      </Link>
                    </div>
                    <p className="hs-caption text-slate-400">
                      Review verified skill baseline and 3 progression milestones to close identified gaps.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-bold text-slate-400">
                    4
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">AI Interview Studio Simulation</p>
                      <Badge tone="neutral">Milestone 5</Badge>
                    </div>
                    <p className="hs-caption text-slate-400">
                      Role-targeted dynamic question generation, voice recording transcription, and rubric grading.
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Sidebar: Skill Gaps & Quick Actions */}
        <div className="space-y-6">
          {/* Top Skill Gaps */}
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title text-base font-semibold text-white">Critical Skill Gaps</h2>
                <p className="mt-0.5 hs-caption text-slate-400">
                  Most frequent missing requirements across target roles.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {matchingSummary?.topSkillGaps?.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {matchingSummary.topSkillGaps.map((item) => (
                      <span
                        key={item.skill}
                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300"
                      >
                        <span>{item.skill}</span>
                        <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[10px] text-amber-200">
                          {item.frequency} {item.frequency === 1 ? 'role' : 'roles'}
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate('/roadmap')}
                    >
                      View Targeted Learning Roadmap
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">
                    {hasMatches
                      ? 'No critical skill gaps identified. Strong alignment across target roles!'
                      : 'Run a job match on the Jobs page to discover skill gaps.'}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Active Resume Snapshot */}
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title text-base font-semibold text-white">Active Resume</h2>
                <p className="mt-0.5 hs-caption text-slate-400">Source profile for semantic intelligence.</p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {hasResumes ? (
                <>
                  <div className="rounded-md border border-white/[0.08] bg-hs-canvas p-3">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {resumeSummary.latestFileName}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Uploaded {new Date(resumeSummary.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Parsing Confidence:</span>
                    <span className="font-semibold text-slate-200">
                      {Math.round((resumeSummary.parsingConfidence || 0.95) * 100)}%
                    </span>
                  </div>
                  {resumeSummary.atsScore > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Resume Health Score:</span>
                      <span className="font-semibold text-slate-200">
                        {resumeSummary.atsScore} / 100
                      </span>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate('/resume')}
                  >
                    Open Resume Intelligence
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">No active resume uploaded.</p>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate('/resume')}
                  >
                    Upload Resume
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Nav Card */}
          <Card>
            <CardHeader>
              <h2 className="hs-title text-base font-semibold text-white">Product Navigation</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-300"
                onClick={() => navigate('/resume')}
              >
                📄 Resume Intelligence & RAG
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-300"
                onClick={() => navigate('/jobs')}
              >
                🎯 Semantic Job Matching & Evidence
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-300"
                onClick={() => navigate('/roadmap')}
              >
                🗺️ Career Progression Roadmap
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-300"
                onClick={() => navigate('/mockprep')}
              >
                🎙️ Interview Studio Staging
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-300"
                onClick={() => navigate('/recruiter')}
              >
                🏢 Recruiter Job Postings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-300"
                onClick={() => navigate('/profile')}
              >
                👤 Candidate Profile & Settings
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
