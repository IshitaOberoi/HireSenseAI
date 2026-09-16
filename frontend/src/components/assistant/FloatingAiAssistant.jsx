import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';

const suggestions = {
  '/dashboard': ['Ask about your career readiness', 'Review today’s recommended actions'],
  '/jobs': ['Explain a match rating', 'Find a skill gap to improve'],
  '/resume': ['Ask about this resume rating', 'Review suggested improvements'],
  '/roadmap': ['Explain the next learning milestone', 'Prioritize a skill to practice'],
  '/mockprep': ['Clarify the current question', 'Review interview feedback'],
  '/recruiter': ['Explain candidate matching', 'Review talent-pool signals'],
  '/profile': ['Review profile completeness', 'Explain profile settings'],
};

export function FloatingAiAssistant({ open, onOpen, onClose }) {
  const location = useLocation(); const closeRef = useRef(null); const currentSuggestions = suggestions[location.pathname] || suggestions['/dashboard'];
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useEffect(() => { if (!open) return undefined; const handler = (event) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, [open, onClose]);
  return <aside aria-label="AI assistant"><Button aria-label="Open contextual AI assistant" onClick={onOpen} className="fixed bottom-5 right-5 z-30 h-12 w-12 rounded-full p-0 text-lg" title="Open AI assistant">?</Button>{open && <div className="fixed inset-0 z-50 bg-[#050816]/45" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label="Contextual AI assistant" className="ml-auto flex h-full w-full max-w-[380px] flex-col border-l border-white/[0.06] bg-hs-surface p-5 shadow-2xl shadow-black/30"><div className="flex items-start justify-between gap-4"><div><p className="hs-title">AI Assistant</p><p className="mt-1 hs-caption text-slate-400">Contextual suggestions for this workspace.</p></div><Button ref={closeRef} variant="ghost" size="sm" onClick={onClose}>Close</Button></div><div className="mt-8"><p className="hs-caption uppercase tracking-wider text-slate-500">Try asking</p><ul className="mt-3 space-y-2">{currentSuggestions.map((item) => <li key={item}><button className="hs-interactive w-full rounded-md border border-white/[0.06] px-3 py-3 text-left text-sm text-slate-200 hover:bg-white/[0.04]">{item}</button></li>)}</ul></div><p className="mt-auto hs-caption text-slate-500">Assistant responses will be connected in a later milestone.</p></section></div>}</aside>;
}
