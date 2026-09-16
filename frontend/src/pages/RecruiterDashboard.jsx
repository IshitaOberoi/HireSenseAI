import React, { useState } from 'react';
import { apiService } from '../services/api';

export default function RecruiterDashboard({ onSelectJob, jobs, onCreateJob }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    experienceYears: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiService.createJob({
        ...formData,
        recruiterId: "00000000-0000-0000-0000-000000000000" // Default Recruiter User UUID
      });
      onCreateJob(response);
      setFormData({ title: '', company: '', description: '', experienceYears: 0 });
      setShowForm(false);
    } catch (err) {
      console.warn("Backend offline - creating local simulated job posting.");
      // Simulated callback for offline presentation
      onCreateJob({
        id: Math.random().toString(),
        title: formData.title,
        company: formData.company,
        description: formData.description,
        experienceYears: formData.experienceYears,
        jobEmbedding: "[-0.05, 0.12, ...]"
      });
      setFormData({ title: '', company: '', description: '', experienceYears: 0 });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Active Job Postings</h2>
          <p className="text-xs text-slate-400">Post positions and evaluate semantically matching applicants</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition-all shadow-md shadow-indigo-600/20"
        >
          {showForm ? "Cancel" : "Post New Position"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4 max-w-xl">
          <h3 className="text-sm font-bold border-b border-slate-800 pb-2 mb-2">Create Job Posting</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Job Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g. AI Engineer" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Stripe" 
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Minimum Experience (Years)</label>
            <input 
              type="number" 
              required
              min="0"
              value={formData.experienceYears}
              onChange={(e) => setFormData({...formData, experienceYears: parseInt(e.target.value) || 0})}
              className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Job Description</label>
            <textarea 
              rows={5}
              required
              placeholder="Paste job details, core responsibilities, and required tech stacks..." 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
            />
          </div>
          <button 
            type="submit" 
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white"
          >
            {submitting ? "Vectorizing Description..." : "Publish & Generate Vector"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-900 rounded-2xl">
            <span className="text-xs text-slate-500">No active job posts. Create one to test semantic vector matching!</span>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-extrabold text-slate-200 text-base">{job.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                    384-Dim Vector
                  </span>
                </div>
                <div className="text-xs text-indigo-400 mb-3">{job.company} • {job.experienceYears} Years Min Exp</div>
                <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                  {job.description}
                </p>
              </div>
              <button 
                onClick={() => onSelectJob(job)}
                className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 transition-all"
              >
                Evaluate Matching Candidates
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
