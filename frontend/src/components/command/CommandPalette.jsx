import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const pages = [
  { label: 'Go to Dashboard', detail: 'Candidate command center', to: '/dashboard' },
  { label: 'Go to Jobs', detail: 'Matches and job opportunities', to: '/jobs' },
  { label: 'Go to Resume Analysis', detail: 'Editorial resume workspace', to: '/resume' },
  { label: 'Go to Career Roadmap', detail: 'Learning timeline', to: '/roadmap' },
  { label: 'Start MockPrep', detail: 'Practice interview studio', to: '/mockprep' },
  { label: 'Go to Recruiter Portal', detail: 'Talent pool and jobs', to: '/recruiter' },
  { label: 'Go to Profile', detail: 'Profile configuration', to: '/profile' },
];

export function CommandPalette({ open, onClose, onOpenAssistant, returnFocusRef }) {
  const navigate = useNavigate(); const dialogRef = useRef(null); const inputRef = useRef(null);
  const [query, setQuery] = useState(''); const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const commands = [{ label: 'Open AI Assistant', detail: 'Show contextual suggestions', action: onOpenAssistant }];
    return [...pages, ...commands].filter((item) => !normalized || `${item.label} ${item.detail}`.toLowerCase().includes(normalized));
  }, [query, onOpenAssistant]);
  const execute = useCallback((item) => { if (item.to) navigate(item.to); else item.action?.(); onClose(); }, [navigate, onClose]);
  useEffect(() => { if (open) { setQuery(''); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  useEffect(() => { setActiveIndex((current) => Math.min(current, Math.max(0, results.length - 1))); }, [results.length]);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => (index + 1) % Math.max(results.length, 1)); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => (index - 1 + results.length) % Math.max(results.length, 1)); return; }
      if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); execute(results[activeIndex]); return; }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown); return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, results, activeIndex, onClose, execute]);
  useEffect(() => { if (!open) returnFocusRef?.current?.focus(); }, [open, returnFocusRef]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#050816]/85 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.1] bg-hs-surface shadow-2xl shadow-black/30">
      <div className="border-b border-white/[0.06] p-3"><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-controls="command-results" aria-activedescendant={results[activeIndex] ? `command-${activeIndex}` : undefined} role="combobox" aria-expanded="true" placeholder="Search commands or pages…" className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500" /></div>
      <div id="command-results" role="listbox" aria-label="Command results" className="hs-scrollbar max-h-[50vh] overflow-y-auto p-2">{results.length ? results.map((item, index) => <button id={`command-${index}`} role="option" aria-selected={index === activeIndex} key={item.label} onMouseEnter={() => setActiveIndex(index)} onClick={() => execute(item)} className={`hs-interactive flex w-full items-center justify-between rounded-md px-3 py-3 text-left ${index === activeIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}><span><span className="block text-sm font-medium text-slate-100">{item.label}</span><span className="mt-0.5 block hs-caption text-slate-400">{item.detail}</span></span><span className="hs-code text-slate-500">Enter</span></button>) : <p className="px-3 py-8 text-center text-sm text-slate-400">No commands found.</p>}</div>
      <footer className="flex gap-4 border-t border-white/[0.06] px-4 py-3 hs-caption text-slate-500"><span>↑↓ Navigate</span><span>Enter Select</span><span>Esc Close</span></footer>
    </section>
  </div>;
}
