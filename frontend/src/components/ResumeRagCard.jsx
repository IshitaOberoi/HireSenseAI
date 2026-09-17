import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { apiService } from '../services/api';

const SUGGESTED_QUESTIONS = [
  "What are the candidate's core skills?",
  "Summarize the candidate's work experience and achievements.",
  "What education credentials does the candidate have?",
  "Does the candidate have experience with Docker or Kubernetes?"
];

export function ResumeRagCard({ resumeId }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showSources, setShowSources] = useState(true);

  const handleSubmit = async (qText) => {
    const textToAsk = (qText || question).trim();
    if (!textToAsk) return;

    setLoading(true);
    setError('');
    try {
      const resp = await apiService.askResumeQuestion(resumeId, textToAsk);
      setResult(resp);
      if (qText) setQuestion(qText);
    } catch (err) {
      setError(err.message || 'Failed to query resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-sky-500/20 shadow-lg">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400"></span>
              <p className="hs-caption uppercase tracking-[0.14em] text-sky-400 font-semibold">
                Grounded Resume Intelligence
              </p>
            </div>
            <h2 className="hs-title mt-1">Ask Your Resume (RAG)</h2>
            <p className="mt-1 hs-caption text-slate-400">
              Query this candidate's resume using 384D semantic search in PostgreSQL (pgvector) and strictly grounded LLM reasoning.
            </p>
          </div>
          <Badge tone="info">pgvector + Groq</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Suggestion Chips */}
        <div>
          <p className="hs-caption text-slate-400 mb-2">Suggested queries:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(chip)}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-sky-200 transition-colors disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex gap-2"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What distributed systems did the candidate build?"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" loading={loading} disabled={!question.trim()}>
            Ask
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-xs text-red-300 bg-red-400/10 border border-red-400/20 rounded p-2.5">
            {error}
          </p>
        )}

        {/* Answer & Sources Display */}
        {result && (
          <div className="space-y-4 rounded-lg border border-white/[0.08] bg-hs-canvas p-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="hs-caption font-semibold uppercase tracking-wider text-sky-300">
                  Grounded Answer
                </span>
                <div className="flex items-center gap-2">
                  {result.metadata?.model && (
                    <Badge tone="neutral" className="text-[10px]">
                      {result.metadata.model}
                    </Badge>
                  )}
                  {result.metadata?.total_latency_ms != null && (
                    <Badge tone="neutral" className="text-[10px]">
                      {result.metadata.total_latency_ms}ms
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                {result.answer}
              </p>
            </div>

            {/* Retrieval Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="border-t border-white/[0.08] pt-3">
                <div className="flex items-center justify-between">
                  <span className="hs-caption text-slate-400">
                    Retrieved pgvector Context ({result.sources.length} {result.sources.length === 1 ? 'chunk' : 'chunks'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSources((v) => !v)}
                    className="text-xs text-sky-400 hover:text-sky-300 underline"
                  >
                    {showSources ? 'Hide Sources' : 'View Sources'}
                  </button>
                </div>

                {showSources && (
                  <div className="mt-3 space-y-2.5">
                    {result.sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-slate-300"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sky-300">
                            Section: {src.sectionName}
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                            Similarity: {(src.similarity * 100).toFixed(1)}% ({src.similarity})
                          </span>
                        </div>
                        <p className="text-slate-400 leading-relaxed italic">
                          "{src.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
