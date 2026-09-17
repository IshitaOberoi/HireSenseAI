import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState, ProgressTimeline } from '../components/ui/LoadingState';
import { SkeletonLines } from '../components/ui/Skeleton';
import { apiService } from '../services/api';
import { ResumeRagCard } from '../components/ResumeRagCard';

const candidateId = import.meta.env.VITE_DEV_CANDIDATE_ID || '11111111-1111-1111-1111-111111111111';
const activeStatuses = new Set(['UPLOADED', 'PROCESSING']);

function parseJson(value) {
  if (!value) return null;
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
}

function statusTone(status) {
  return status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'danger' : status === 'PROCESSING' ? 'info' : 'warning';
}

function ProcessingTimeline({ status }) {
  const complete = status === 'COMPLETED'; const failed = status === 'FAILED';
  const state = (target) => complete || ['UPLOADED', 'PROCESSING'].includes(target) && status !== 'FAILED' ? 'complete' : status === target ? 'active' : 'pending';
  return <ProgressTimeline steps={[
    { id: 'upload', label: 'File upload complete', detail: 'Resume stored securely for processing.', status: state('UPLOADED') },
    { id: 'extract', label: 'Extracting document text', detail: 'PDF/DOCX text extraction with OCR when needed.', status: status === 'PROCESSING' || complete ? 'complete' : failed ? 'pending' : 'active' },
    { id: 'parse', label: 'Structuring resume entities', detail: 'Groq parses validated resume fields.', status: status === 'PROCESSING' || complete ? 'active' : 'pending' },
    { id: 'embed', label: 'Generating semantic embedding', detail: 'all-MiniLM-L6-v2 produces a 384-dimensional vector.', status: complete ? 'complete' : 'pending' },
  ]} />;
}

function ResumeUpload({ onUploaded }) {
  const [file, setFile] = useState(null); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const upload = async (event) => {
    event.preventDefault(); setError('');
    if (!file) { setError('Choose a PDF or DOCX resume first.'); return; }
    const valid = /\.(pdf|docx)$/i.test(file.name);
    if (!valid) { setError('Upload a PDF or DOCX resume.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Resume files must not exceed 10 MB.'); return; }
    setSubmitting(true);
    try { await apiService.uploadResume(file, candidateId); setFile(null); await onUploaded(); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  };
  return <Card><CardHeader><div><h1 className="hs-title">Resume Intelligence</h1><p className="mt-1 hs-caption text-slate-400">Upload a PDF or DOCX to build your resume analysis.</p></div></CardHeader><CardBody><form onSubmit={upload} className="space-y-4"><label className="block rounded-lg border border-dashed border-white/[0.14] bg-hs-canvas px-5 py-8 text-center hs-interactive hover:border-sky-400/50"><span className="block text-sm font-medium text-slate-200">{file ? file.name : 'Choose your resume file'}</span><span className="mt-1 block hs-caption text-slate-500">PDF or DOCX · Maximum 10 MB</span><input className="sr-only" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>{error && <p role="alert" className="hs-caption text-red-300">{error}</p>}<Button type="submit" loading={submitting} disabled={!file}>Upload resume</Button></form></CardBody></Card>;
}

function Analysis({ resume }) {
  const [showRawText, setShowRawText] = useState(false);
  const parsed = useMemo(() => parseJson(resume.parsedResumeJson), [resume.parsedResumeJson]);
  if (!parsed) return <Card><CardBody><SkeletonLines lines={5} label="Preparing parsed resume analysis" /></CardBody></Card>;
  const name = [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || 'Resume analysis';
  const headline = parsed.experience?.[0] ? `${parsed.experience[0].title} at ${parsed.experience[0].company}` : 'Structured resume profile';
  const summaryText = parsed.summary || (
    parsed.skills?.length || parsed.experience?.length
      ? `${name} presents experience in ${parsed.experience?.[0]?.title || 'engineering'} with key skills across ${parsed.skills?.slice(0, 6).join(', ') || 'technical disciplines'}.`
      : 'Structured profile extracted from your uploaded document.'
  );

  return <div className="space-y-5">
    <Card><CardHeader><div><p className="hs-caption uppercase tracking-[0.14em] text-sky-300">Resume Analysis</p><h1 className="hs-heading mt-2">{name}</h1><p className="mt-2 text-sm text-slate-400">{headline}</p></div><Badge tone="success">Completed</Badge></CardHeader><CardBody className="grid gap-5 sm:grid-cols-3"><div><p className="hs-caption text-slate-500">Parsing confidence</p><p className="mt-1 text-2xl font-bold">{Math.round((resume.parsingConfidence || 0) * 100)}%</p></div>{resume.atsScore > 0 && <div><p className="hs-caption text-slate-500">Resume health</p><p className="mt-1 text-2xl font-bold">{resume.atsScore}/100</p></div>}<div><p className="hs-caption text-slate-500">Source document</p><p className="mt-1 text-sm font-medium text-slate-200 break-all">{resume.fileName}</p></div></CardBody></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><h2 className="hs-title">Executive Summary</h2></CardHeader><CardBody><p className="text-sm leading-6 text-slate-300">{summaryText}</p></CardBody></Card><Card><CardHeader><h2 className="hs-title">Skills</h2></CardHeader><CardBody>{parsed.skills?.length ? <div className="flex flex-wrap gap-2">{parsed.skills.map((skill) => <Badge key={skill} tone="info">{skill}</Badge>)}</div> : <p className="text-sm text-slate-400">No skills were extracted.</p>}</CardBody></Card></div>
    <Card><CardHeader><h2 className="hs-title">Experience</h2></CardHeader><CardBody className="space-y-5">{parsed.experience?.length ? parsed.experience.map((item, index) => <article key={`${item.company}-${index}`} className="border-l border-white/[0.08] pl-4"><h3 className="text-sm font-semibold text-slate-100">{item.title || 'Role'} · {item.company || 'Organization'}</h3><p className="mt-1 hs-caption text-slate-500">{[item.start_date, item.end_date].filter(Boolean).join(' — ')}</p>{item.responsibilities?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-400">{item.responsibilities.map((entry, entryIndex) => <li key={entryIndex}>{entry}</li>)}</ul>}</article>) : <p className="text-sm text-slate-400">No experience entries were extracted.</p>}</CardBody></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><h2 className="hs-title">Education</h2></CardHeader><CardBody className="space-y-4">{parsed.education?.length ? parsed.education.map((item, index) => <article key={`${item.institution}-${index}`}><h3 className="text-sm font-semibold text-slate-100">{item.institution}</h3><p className="mt-1 text-sm text-slate-400">{[item.degree, item.major].filter(Boolean).join(' · ')}</p><p className="mt-1 hs-caption text-slate-500">{[item.start_date, item.end_date].filter(Boolean).join(' — ')}</p></article>) : <p className="text-sm text-slate-400">No education entries were extracted.</p>}</CardBody></Card><Card><CardHeader><h2 className="hs-title">Projects</h2></CardHeader><CardBody className="space-y-4">{parsed.projects?.length ? parsed.projects.map((item, index) => <article key={`${item.title}-${index}`}><h3 className="text-sm font-semibold text-slate-100">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p></article>) : <p className="text-sm text-slate-400">No project entries were extracted.</p>}</CardBody></Card></div>
    <ResumeRagCard resumeId={resume.id} />
    {resume.rawResumeText && (
      <Card>
        <CardHeader>
          <div className="flex w-full items-center justify-between">
            <div>
              <h2 className="hs-title">Raw Extracted Document Text</h2>
              <p className="mt-1 hs-caption text-slate-400">Source text extracted from {resume.fileName} before structuring.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowRawText((v) => !v)}>
              {showRawText ? 'Hide extracted text' : 'View extracted text'}
            </Button>
          </div>
        </CardHeader>
        {showRawText && (
          <CardBody>
            <pre className="max-h-96 overflow-y-auto rounded-md border border-white/[0.08] bg-hs-canvas p-4 hs-code text-xs leading-5 text-slate-300 whitespace-pre-wrap break-words">
              {resume.rawResumeText}
            </pre>
          </CardBody>
        )}
      </Card>
    )}
  </div>;
}

export default function ResumeAnalysisPage() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await apiService.getResumes(candidateId);
      setResumes(response || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const activeResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];

  useEffect(() => {
    if (!activeResume || !activeStatuses.has(activeResume.processingStatus)) return undefined;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [activeResume, load]);

  if (loading) return <LoadingState label="Loading resume intelligence…" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ResumeUpload onUploaded={async () => { setLoading(true); await load(); }} />

      {error && (
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setLoading(true); load(); }}>Try again</Button>
          </CardBody>
        </Card>
      )}

      {resumes.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-hs-surface p-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Switch Active Resume</p>
            <p className="hs-caption text-slate-400">Select which resume document to inspect and analyze.</p>
          </div>
          <select
            value={activeResume?.id || ''}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="rounded-md border border-white/[0.14] bg-hs-canvas px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          >
            {resumes.map((r, i) => (
              <option key={r.id} value={r.id}>
                {r.fileName} {i === 0 ? '(Latest)' : ''} — {new Date(r.uploadedAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {!activeResume && !error && (
        <EmptyState title="No resume analysis yet" description="Upload a PDF or DOCX resume to begin structured analysis." />
      )}

      {activeResume && (
        <>
          <Card>
            <CardHeader>
              <div>
                <h2 className="hs-title">Processing status</h2>
                <p className="mt-1 hs-caption text-slate-400">{activeResume.fileName}</p>
              </div>
              <Badge tone={statusTone(activeResume.processingStatus)}>{activeResume.processingStatus}</Badge>
            </CardHeader>
            <CardBody>
              <ProcessingTimeline status={activeResume.processingStatus} />
              {activeResume.processingStatus === 'FAILED' && (
                <p role="alert" className="mt-5 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                  {activeResume.processingError || 'Resume processing failed. Upload a corrected document and try again.'}
                </p>
              )}
            </CardBody>
          </Card>
          {activeResume.processingStatus === 'COMPLETED' && <Analysis resume={activeResume} />}
        </>
      )}
    </div>
  );
}
