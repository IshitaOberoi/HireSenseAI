import React from 'react';

export default function MatchReasoningCard({ matchReasoning, matchingConfidence }) {
  if (!matchReasoning) return null;

  // Simple parser to separate strengths and gaps if formatted as standard text,
  // or we can render it directly inside a beautiful scrollable markdown box.
  return (
    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Explainable AI Reasoning</span>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
          Confidence: {matchingConfidence * 100}%
        </span>
      </div>

      <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
        {matchReasoning}
      </div>

      <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 text-[10px] text-indigo-400">
        ℹ This explanation was synthesized by the Career Intelligence Engine using prompts/v1/match_reasoning.md comparing candidate experiences directly against job descriptions.
      </div>
    </div>
  );
}
