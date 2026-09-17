import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { apiService } from '../services/api';

const DEFAULT_RECRUITER_ID = '00000000-0000-0000-0000-000000000001';

export default function RecruiterPortalPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    experienceYears: 3,
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getRecruiterJobs();
      setJobs(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch recruiter jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.company.trim() || !formData.description.trim()) {
      setError('Title, company, and description are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiService.createJob({
        ...formData,
        experienceYears: Number(formData.experienceYears) || 0,
        recruiterId: DEFAULT_RECRUITER_ID,
      });
      setFormData({ title: '', company: '', description: '', experienceYears: 3 });
      setShowCreateForm(false);
      await loadJobs();
    } catch (err) {
      setError(err.message || 'Failed to create job posting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectJob = async (job) => {
    setSelectedJob(job);
    setLoadingMatches(true);
    try {
      const matchData = await apiService.getJobMatches(job.id);
      setMatches(matchData || []);
    } catch (err) {
      console.warn('Failed to load candidate matches for job:', err);
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading recruiter opening positions…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="hs-caption font-semibold uppercase tracking-wider text-sky-400">
            Recruiter Overview
          </span>
          <h1 className="hs-heading mt-1 text-2xl font-bold text-white sm:text-3xl">
            Recruiter Job Openings &amp; Talent Pool
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage active company job listings and inspect pgvector candidate matches.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowCreateForm((v) => !v);
            setError('');
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Post New Role'}
        </Button>
      </div>

      {error && (
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-red-300">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Post Role Form */}
      {showCreateForm && (
        <Card className="border-sky-400/20 bg-hs-surface">
          <CardHeader>
            <div>
              <h2 className="hs-title text-base font-semibold text-white">Create New Job Posting</h2>
              <p className="mt-0.5 hs-caption text-slate-400">
                Vector embeddings will be generated automatically by the AI engine.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateJob} className="space-y-4 max-w-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="job-title" className="block text-xs font-medium text-slate-300 mb-1">
                    Role Title *
                  </label>
                  <input
                    id="job-title"
                    type="text"
                    required
                    placeholder="e.g. Senior Backend Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label htmlFor="company-name" className="block text-xs font-medium text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Inc."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="experience-years" className="block text-xs font-medium text-slate-300 mb-1">
                  Required Experience (Years)
                </label>
                <input
                  id="experience-years"
                  type="number"
                  min="0"
                  max="40"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="w-32 rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>

              <div>
                <label htmlFor="job-description" className="block text-xs font-medium text-slate-300 mb-1">
                  Job Description &amp; Requirements *
                </label>
                <textarea
                  id="job-description"
                  required
                  rows={5}
                  placeholder="Paste complete role description, responsibilities, required skills, and qualifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={submitting}>
                  Publish Role &amp; Embed
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Main Content: Jobs List & Candidate Matching Detail */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title text-base font-semibold text-white">Active Positions ({jobs.length})</h2>
                <p className="mt-0.5 hs-caption text-slate-400">
                  Select a job to view semantically matched candidates.
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {jobs.length > 0 ? (
                <div className="divide-y divide-white/[0.06]">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`flex cursor-pointer flex-col justify-between gap-3 p-5 transition-colors sm:flex-row sm:items-center ${
                        selectedJob?.id === job.id ? 'bg-white/[0.04] border-l-2 border-sky-400' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                          <Badge tone="neutral">{job.company}</Badge>
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-400">
                          {job.description}
                        </p>
                        <p className="hs-caption text-slate-500">
                          {job.experienceYears} yrs experience · Posted {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Button
                          variant={selectedJob?.id === job.id ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectJob(job);
                          }}
                        >
                          {selectedJob?.id === job.id ? 'Viewing Matches' : 'Inspect Candidates'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-300 font-medium">
                    No active recruiter positions posted yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    The candidate career intelligence workspace is the primary focus of this build. You can post a role above to test recruiter vector indexing.
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Post Sample Role
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right: Candidate Matches for Selected Job */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title text-base font-semibold text-white">
                  {selectedJob ? `Talent Matches for ${selectedJob.title}` : 'Matched Candidates'}
                </h2>
                <p className="mt-0.5 hs-caption text-slate-400">
                  Ranked by pgvector cosine similarity.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {selectedJob ? (
                loadingMatches ? (
                  <LoadingState label="Computing pgvector similarity..." />
                ) : matches.length > 0 ? (
                  <div className="space-y-3">
                    {matches.map((m, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-white/[0.08] bg-hs-canvas p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {m.first_name} {m.last_name}
                          </span>
                          <Badge tone="success">
                            {Math.round(Number(m.similarity_score) || 0)}% Similarity
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Resume: {m.file_name}
                        </p>
                        {m.match_reasoning && (
                          <p className="text-[11px] leading-relaxed text-slate-300 border-t border-white/[0.06] pt-1 mt-1">
                            {m.match_reasoning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No matching candidate resumes indexed for this position yet.
                  </p>
                )
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  Select a job posting on the left to view matching candidates.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
