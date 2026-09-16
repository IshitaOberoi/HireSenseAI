import React from 'react';

export default function SkillGapRadar({ skillGap }) {
  if (!skillGap) return null;

  const { overlapping_skills = [], missing_skills = [], skill_coverage = 0, confidence = 0.0 } = skillGap;

  return (
    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skill Gap Diagnostics</span>
        <span className="text-[10px] text-slate-500 font-mono">Confidence: {confidence * 100}%</span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Coverage Percentage Gauge */}
        <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-slate-900 border border-slate-800">
          <div className="text-center">
            <span className="text-sm font-extrabold text-indigo-400">{skill_coverage}%</span>
            <p className="text-[8px] text-slate-500 uppercase">Coverage</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-400 font-semibold mb-1">Overall Alignment</div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" 
              style={{ width: `${skill_coverage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        {/* Overlapping/Possessed Skills */}
        <div>
          <div className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Possessed ({overlapping_skills.length})</div>
          {overlapping_skills.length === 0 ? (
            <span className="text-[10px] text-slate-600">None detected</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {overlapping_skills.map((skill, index) => (
                <span key={index} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Missing Skills */}
        <div>
          <div className="text-[10px] font-bold text-red-400 uppercase mb-2">Missing ({missing_skills.length})</div>
          {missing_skills.length === 0 ? (
            <span className="text-[10px] text-slate-600">None detected</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {missing_skills.map((skill, index) => (
                <span key={index} className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
