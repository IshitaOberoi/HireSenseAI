import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { apiService } from '../services/api';

const candidateId = import.meta.env.VITE_DEV_CANDIDATE_ID || '11111111-1111-1111-1111-111111111111';

function phaseBadgeTone(status) {
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'RECOMMENDED') return 'info';
  return 'neutral';
}

function phaseStatusLabel(status) {
  if (status === 'IN_PROGRESS') return 'Active Focus';
  if (status === 'RECOMMENDED') return 'Next Horizon';
  return 'Strategic Goal';
}

export default function CareerRoadmapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRoadmap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getCandidateRoadmap(candidateId);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to load career roadmap');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  if (loading) {
    return <LoadingState label="Synthesizing career progression roadmap…" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={loadRoadmap}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const {
    candidateName,
    verifiedSkills = [],
    skillCoverage,
    targetRoles = [],
    identifiedSkillGaps = [],
    identifiedPreferredGaps = [],
    progressionPhases = [],
  } = data || {};

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="hs-caption font-semibold uppercase tracking-wider text-sky-400">
            Career Progression Intelligence
          </span>
          <h1 className="hs-heading mt-1 text-2xl font-bold text-white sm:text-3xl">
            Strategic Skill & Role Roadmap
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Grounded progression milestones mapped from your verified skills and target role requirements for {candidateName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
            Command Center
          </Button>
          <Button size="sm" onClick={() => navigate('/jobs')}>
            Evaluate New Role
          </Button>
        </div>
      </div>

      {/* Transparent Skill Coverage Banner */}
      {skillCoverage && (
        <Card className="border-sky-400/20 bg-hs-surface">
          <CardBody className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="hs-caption font-semibold uppercase tracking-wider text-sky-300">
                    Required Skill Coverage
                  </span>
                  <Badge tone="info">Deterministic</Badge>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {skillCoverage.coverageText}
                </h2>
                <p className="text-xs text-slate-400">
                  Calculated transparently across evaluated target job descriptions and verified resume evidence.
                </p>
              </div>

              <div className="flex items-center gap-6 sm:border-l sm:border-white/[0.08] sm:pl-6">
                <div>
                  <span className="block text-2xl font-bold text-emerald-400">
                    {skillCoverage.verifiedCount}
                  </span>
                  <span className="text-xs text-slate-400">Verified Skills</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-amber-400">
                    {skillCoverage.missingCount}
                  </span>
                  <span className="text-xs text-slate-400">Identified Gaps</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-white">
                    {Math.round((skillCoverage.coverageRatio || 1) * 100)}%
                  </span>
                  <span className="text-xs text-slate-400">Coverage Ratio</span>
                </div>
              </div>
            </div>

            {/* Coverage Progress Bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.round((skillCoverage.coverageRatio || 1) * 100)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round((skillCoverage.coverageRatio || 1) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Target Roles Evaluated */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="hs-title text-base font-semibold text-white">Evaluated Target Roles</h2>
            <p className="mt-0.5 hs-caption text-slate-400">
              Roles forming the target benchmark for your progression phases.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            Add Target Role
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {targetRoles.length > 0 ? (
            <div className="divide-y divide-white/[0.06]">
              {targetRoles.map((role) => (
                <div
                  key={role.matchId}
                  className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center hover:bg-white/[0.02]"
                >
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{role.roleTitle}</h3>
                      {role.company && (
                        <p className="text-xs text-slate-400">{role.company}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500">Missing Requirements:</span>
                      {role.missingSkills && role.missingSkills.length > 0 ? (
                        role.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-400">All required skills verified</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-lg font-bold text-white">{role.matchScore}%</span>
                      <span className="block text-[11px] text-slate-400">
                        {role.requiredMatched} / {role.requiredTotal} skills verified
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/jobs')}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No target roles have been evaluated yet.</p>
              <p className="mt-1 hs-caption text-slate-500">
                Evaluating target roles on the Jobs page calibrates your progression milestones against real industry requirements.
              </p>
              <Button size="sm" className="mt-4" onClick={() => navigate('/jobs')}>
                Evaluate Target Role on Jobs Page
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 3-Phase Progression Milestones */}
      <section aria-labelledby="progression-milestones-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="progression-milestones-heading" className="hs-title text-lg font-semibold text-white">
              3-Phase Progression Milestones
            </h2>
            <p className="hs-caption text-slate-400">
              Grounded, actionable roadmap designed to close identified requirements and deepen expertise.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {progressionPhases.map((phase) => (
            <Card key={phase.phaseNumber} className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="hs-caption text-sky-400 font-semibold">{phase.timeHorizon}</span>
                      <Badge tone={phaseBadgeTone(phase.status)}>
                        {phaseStatusLabel(phase.status)}
                      </Badge>
                    </div>
                    <h3 className="hs-title text-base font-bold text-white">{phase.phaseTitle}</h3>
                    <p className="text-xs text-slate-400">{phase.focusArea}</p>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  {/* Target Skills */}
                  <div>
                    <p className="hs-caption font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Focus Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.targetSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-xs text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <p className="hs-caption font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Action Items
                    </p>
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
                      {phase.recommendedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardBody>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Identified Skill Gaps (Required or Preferred) */}
      {identifiedSkillGaps.length > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <h2 className="hs-title text-base font-semibold text-white">Identified Required Skill Gaps to Bridge</h2>
              <p className="mt-0.5 hs-caption text-slate-400">
                Skills required by evaluated target roles that are not yet verified on your resume ({identifiedSkillGaps.length} total).
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {identifiedSkillGaps.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300"
                >
                  ! {skill}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : identifiedPreferredGaps.length > 0 ? (
        <Card className="border-sky-400/20">
          <CardHeader>
            <div>
              <h2 className="hs-title text-base font-semibold text-white">Preferred Qualifications to Strengthen</h2>
              <p className="mt-0.5 hs-caption text-slate-400">
                100% of required competencies are verified! These preferred qualifications from evaluated roles provide opportunities for advanced differentiation ({identifiedPreferredGaps.length} total).
              </p>
            </div>
            <Badge tone="info">100% Required Match</Badge>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {identifiedPreferredGaps.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300"
                >
                  ★ {skill}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Verified Skills Baseline */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="hs-title text-base font-semibold text-white">Verified Skills Baseline</h2>
            <p className="mt-0.5 hs-caption text-slate-400">
              Capabilities verified across your uploaded resumes and semantic evaluation matches ({verifiedSkills.length} total).
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/resume')}>
            Inspect Resume
          </Button>
        </CardHeader>
        <CardBody>
          {verifiedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {verifiedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No skills extracted yet. Upload your resume to establish your verified skills baseline.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
