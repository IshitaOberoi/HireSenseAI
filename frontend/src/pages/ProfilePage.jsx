import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { apiService } from '../services/api';

const candidateId = import.meta.env.VITE_DEV_CANDIDATE_ID || '11111111-1111-1111-1111-111111111111';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    githubUrl: '',
    linkedinUrl: '',
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getCandidateProfile(candidateId);
      setProfile(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        githubUrl: data.githubUrl || '',
        linkedinUrl: data.linkedinUrl || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const updated = await apiService.updateCandidateProfile(candidateId, formData);
      setProfile(updated);
      setSuccessMessage('Profile information saved successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading candidate profile…" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="hs-caption font-semibold uppercase tracking-wider text-sky-400">
            Account &amp; Identity
          </span>
          <h1 className="hs-heading mt-1 text-2xl font-bold text-white sm:text-3xl">
            Candidate Profile &amp; Settings
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your personal contact information, public portfolios, and system configurations.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      {error && (
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-red-300">{error}</p>
          </CardBody>
        </Card>
      )}

      {successMessage && (
        <Card className="border-emerald-400/20 bg-emerald-400/5">
          <CardBody className="p-4">
            <p className="text-sm text-emerald-300 font-medium">✓ {successMessage}</p>
          </CardBody>
        </Card>
      )}

      {/* Main Profile Form */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="hs-title text-base font-semibold text-white">Contact Information</h2>
            <p className="mt-0.5 hs-caption text-slate-400">
              Information referenced during resume intelligence and candidate export.
            </p>
          </div>
          <Badge tone="info">Candidate Profile</Badge>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="block text-xs font-medium text-slate-300 mb-1">
                  First Name *
                </label>
                <input
                  id="first-name"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>

              <div>
                <label htmlFor="last-name" className="block text-xs font-medium text-slate-300 mb-1">
                  Last Name *
                </label>
                <input
                  id="last-name"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email-address" className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address (Associated User Account)
                </label>
                <input
                  id="email-address"
                  type="email"
                  disabled
                  value={profile?.email || 'dev.candidate@hiresense.local'}
                  className="w-full rounded-md border border-white/[0.08] bg-hs-surface px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Account email cannot be modified from candidate profile.
                </span>
              </div>

              <div>
                <label htmlFor="phone-number" className="block text-xs font-medium text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="github-url" className="block text-xs font-medium text-slate-300 mb-1">
                  GitHub Profile URL
                </label>
                <input
                  id="github-url"
                  type="url"
                  placeholder="https://github.com/username"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>

              <div>
                <label htmlFor="linkedin-url" className="block text-xs font-medium text-slate-300 mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  id="linkedin-url"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button type="submit" loading={saving}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Collapsed System Information Disclosure */}
      <Card>
        <CardHeader>
          <div className="flex w-full items-center justify-between">
            <div>
              <h2 className="hs-title text-base font-semibold text-white">System Architecture &amp; Platform Info</h2>
              <p className="mt-0.5 hs-caption text-slate-400">
                Underlying AI models and vector database specifications.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSystemInfo((v) => !v)}
            >
              {showSystemInfo ? 'Hide details' : 'Show details'}
            </Button>
          </div>
        </CardHeader>
        {showSystemInfo && (
          <CardBody className="space-y-4 border-t border-white/[0.06] pt-4">
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-md border border-white/[0.06] bg-hs-canvas p-3 space-y-1">
                <span className="text-slate-500 block">Platform Version</span>
                <span className="font-semibold text-slate-200">HireSense AI 1.0 (Milestone 4)</span>
              </div>

              <div className="rounded-md border border-white/[0.06] bg-hs-canvas p-3 space-y-1">
                <span className="text-slate-500 block">Vector Database</span>
                <span className="font-semibold text-slate-200">PostgreSQL 16 + pgvector (384-dim cosine)</span>
              </div>

              <div className="rounded-md border border-white/[0.06] bg-hs-canvas p-3 space-y-1">
                <span className="text-slate-500 block">Embedding Model</span>
                <span className="font-semibold text-slate-200">sentence-transformers/all-MiniLM-L6-v2</span>
              </div>

              <div className="rounded-md border border-white/[0.06] bg-hs-canvas p-3 space-y-1">
                <span className="text-slate-500 block">Inference Provider</span>
                <span className="font-semibold text-slate-200">Groq (openai/gpt-oss-120b)</span>
              </div>
            </div>

            <div className="rounded-md border border-white/[0.06] bg-hs-canvas p-3 text-xs text-slate-400">
              <span className="text-slate-500 block mb-1">Candidate Profile UUID:</span>
              <span className="font-mono text-sky-300">{candidateId}</span>
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
