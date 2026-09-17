import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { apiService } from '../services/api';

const candidateId = import.meta.env.VITE_DEV_CANDIDATE_ID || '11111111-1111-1111-1111-111111111111';

export default function MockPrepPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dash = await apiService.getCandidateDashboard(candidateId);
      setDashboard(dash);
    } catch (err) {
      setError(err.message || 'Failed to load readiness status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingState label="Checking interview readiness prerequisites…" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={loadData}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { resumeSummary, matchingSummary } = dashboard || {};
  const resumeReady = resumeSummary && resumeSummary.latestStatus === 'COMPLETED';
  const roleReady = matchingSummary && matchingSummary.totalMatches > 0;
  const recentRole = matchingSummary?.recentMatches?.[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="hs-caption font-semibold uppercase tracking-wider text-sky-400">
              Interview Practice Workspace
            </span>
            <Badge tone="warning">Milestone 5 Staging</Badge>
          </div>
          <h1 className="hs-heading mt-1 text-2xl font-bold text-white sm:text-3xl">
            AI Interview Studio & Practice
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Preparation staging for realistic, role-tailored technical & behavioral mock interviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button size="sm" onClick={() => navigate('/jobs')}>
            Calibrate Role
          </Button>
        </div>
      </div>

      {/* Honest Milestone Notice */}
      <Card className="border-sky-400/20 bg-sky-400/5">
        <CardBody className="p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">🎙️</span>
            <div>
              <h2 className="text-sm font-semibold text-sky-200">
                Interactive Voice Interview Studio is Scheduled for Milestone 5
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                In this release (Milestone 4), the backend RAG Q&amp;A, resume structuring, and semantic job matching are fully operational.
                The full voice capture pipeline—including browser Web Audio recording, Whisper transcription, and real-time rubric scoring—will arrive in the upcoming Milestone 5 Interview Studio update.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Readiness Checklist */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="hs-title text-base font-semibold text-white">Interview Readiness Checklist</h2>
            <p className="mt-0.5 hs-caption text-slate-400">
              Ensure your career artifacts are calibrated before entering live mock interview sessions.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-4">
            {/* Step 1: Resume Baseline */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-hs-canvas p-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${resumeReady ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>
                  {resumeReady ? '✓' : '!'}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">1. Verified Resume Intelligence</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {resumeReady
                      ? `Ready: Using verified capabilities from ${resumeSummary.latestFileName} (health: ${resumeSummary.atsScore}/100).`
                      : 'Upload and parse your resume so interview questions reflect your authentic technical background.'}
                  </p>
                </div>
              </div>
              <Button
                variant={resumeReady ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => navigate('/resume')}
              >
                {resumeReady ? 'Inspect Resume' : 'Upload Resume'}
              </Button>
            </div>

            {/* Step 2: Target Role Alignment */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-hs-canvas p-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${roleReady ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>
                  {roleReady ? '✓' : '!'}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">2. Target Role Calibration</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {roleReady && recentRole
                      ? `Ready: Calibrated against ${recentRole.jobTitle} (${recentRole.matchScore}% alignment).`
                      : 'Evaluate at least one target job description so questions probe your specific skill gaps.'}
                  </p>
                </div>
              </div>
              <Button
                variant={roleReady ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => navigate('/jobs')}
              >
                {roleReady ? 'Inspect Target Role' : 'Evaluate Job'}
              </Button>
            </div>

            {/* Step 3: Hardware & Environment */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-hs-canvas p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-300">
                  ✓
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">3. Audio &amp; Browser Permissions</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Ensure standard microphone access in your browser. MockPrep uses Web Audio API for uncompressed WAV streaming.
                  </p>
                </div>
              </div>
              <Badge tone="neutral">Ready</Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Preview of Upcoming Milestone 5 Capabilities */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="hs-title text-base font-semibold text-white">Upcoming AI Interview Studio Capabilities</h2>
            <p className="mt-0.5 hs-caption text-slate-400">
              A brief preview of what is being built in the upcoming milestone.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-white/[0.08] bg-hs-canvas p-4 space-y-2">
              <span className="text-xl">🎯</span>
              <h3 className="text-sm font-semibold text-white">Role-Targeted Questions</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Dynamic generation of technical and architectural interview questions derived directly from missing requirements identified during your job match.
              </p>
            </div>

            <div className="rounded-md border border-white/[0.08] bg-hs-canvas p-4 space-y-2">
              <span className="text-xl">🎙️</span>
              <h3 className="text-sm font-semibold text-white">Whisper Speech-to-Text</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                High-fidelity audio transcription capturing spoken candidate answers, pauses, technical terminology, and conciseness.
              </p>
            </div>

            <div className="rounded-md border border-white/[0.08] bg-hs-canvas p-4 space-y-2">
              <span className="text-xl">📊</span>
              <h3 className="text-sm font-semibold text-white">Multi-Dimensional Rubrics</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Objective scoring across technical correctness, communication clarity, problem decomposition, and STAR story structure.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
