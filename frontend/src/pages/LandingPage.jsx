import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';

const journey = ['Resume', 'AI Analysis', 'Semantic Matching', 'Interview Preparation', 'Career Growth'];
const features = [
  { title: 'Resume Intelligence', copy: 'Turn your experience into a clear, structured profile with evidence-led improvement guidance.', icon: '↗' },
  { title: 'AI Job Matching', copy: 'Understand where your background aligns with a role through semantic, not keyword-only, matching.', icon: '⌁' },
  { title: 'Skill Gap Analysis', copy: 'Identify the capabilities that matter most, then convert each gap into a focused next step.', icon: '◫' },
  { title: 'AI Interview Studio', copy: 'Practice role-specific questions, review recorded answers, and improve with structured feedback.', icon: '◌' },
];
const architecture = ['Candidate', 'Resume', 'Spring Boot', 'AI Service', 'Semantic Engine', 'Insights'];
const differentiators = [
  ['AI-native', 'Guidance appears at the moment a career decision needs to be made.'],
  ['Explainable recommendations', 'Every score and recommendation is paired with the evidence behind it.'],
  ['Semantic matching', 'Your experience is read for context and capability, not just exact word overlap.'],
  ['Career guidance', 'A practical roadmap connects opportunities with focused skill development.'],
  ['Interview preparation', 'Structured practice turns role requirements into stronger, clearer answers.'],
];

function Reveal({ children, delay = 0, className }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y: 14 }} whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.36, delay, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div>;
}

function Arrow() { return <span aria-hidden="true" className="my-1 text-center text-slate-600 sm:my-0 sm:px-2">↓</span>; }

export default function LandingPage() {
  const navigate = useNavigate();
  return <div className="pb-12 sm:pb-20">
    <section className="grid min-h-[calc(100vh-10rem)] items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <Reveal>
        <Badge tone="info">Career Intelligence Platform</Badge>
        <h1 className="hs-display mt-6 max-w-3xl">Build a career narrative that moves opportunities forward.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400">HireSense turns your resume, target roles, and interview practice into explainable guidance for the next meaningful step in your career.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" onClick={() => navigate('/resume')}>Upload Resume</Button><Button variant="secondary" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Explore Features</Button></div>
        <p className="mt-5 hs-caption text-slate-500">Structured analysis. Context-aware matching. Recorded interview preparation.</p>
      </Reveal>
      <Reveal delay={0.08}>
        <Card className="overflow-hidden"><CardBody className="p-0"><div className="border-b border-white/[0.06] px-5 py-4"><div className="flex items-center justify-between"><div><p className="hs-caption uppercase tracking-[0.14em] text-slate-500">Career signal</p><p className="mt-1 text-sm font-semibold text-slate-100">Your next opportunity, made legible.</p></div><Badge tone="success">Ready</Badge></div></div><div className="grid gap-px bg-white/[0.06] sm:grid-cols-2"><div className="bg-hs-surface p-5"><p className="hs-caption text-slate-500">Resume intelligence</p><p className="mt-3 text-2xl font-bold tracking-tight">Clear evidence</p><p className="mt-2 text-sm text-slate-400">Experience organized into strengths, gaps, and credible impact.</p></div><div className="bg-hs-surface p-5"><p className="hs-caption text-slate-500">Role alignment</p><p className="mt-3 text-2xl font-bold tracking-tight">Context first</p><p className="mt-2 text-sm text-slate-400">Signals connect your background to the work a role actually requires.</p></div></div><div className="bg-hs-surface-raised px-5 py-4"><p className="hs-caption text-sky-300">Today’s insight</p><p className="mt-1 text-sm leading-6 text-slate-300">Strengthening your deployment evidence would make your backend experience easier to recognize across platform roles.</p></div></CardBody></Card>
      </Reveal>
    </section>

    <section aria-labelledby="journey-heading" className="border-y border-white/[0.06] py-12 sm:py-16"><Reveal><p className="hs-caption uppercase tracking-[0.14em] text-sky-300">One connected journey</p><h2 id="journey-heading" className="hs-heading mt-3">From experience to momentum.</h2><div className="mt-9 flex flex-col items-center sm:flex-row sm:justify-between">{journey.map((step, index) => <React.Fragment key={step}><motion.div whileHover={{ y: -2 }} transition={{ duration: 0.16 }} className="w-full rounded-md border border-white/[0.06] bg-hs-surface px-4 py-3 text-center text-sm font-semibold text-slate-200 sm:w-auto">{step}</motion.div>{index < journey.length - 1 && <Arrow />}</React.Fragment>)}</div></Reveal></section>

    <section id="features" aria-labelledby="features-heading" className="py-16 sm:py-24"><Reveal><p className="hs-caption uppercase tracking-[0.14em] text-sky-300">Built for deliberate progress</p><h2 id="features-heading" className="hs-heading mt-3">A career system, not another checklist.</h2></Reveal><div className="mt-9 grid gap-4 md:grid-cols-2"><>{features.map((feature, index) => <Reveal key={feature.title} delay={index * 0.05}><Card interactive className="h-full"><CardBody><span className="grid h-9 w-9 place-items-center rounded-md border border-sky-400/20 bg-sky-400/10 text-lg text-sky-300" aria-hidden="true">{feature.icon}</span><h3 className="hs-title mt-5">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{feature.copy}</p></CardBody></Card></Reveal>)}</></div></section>

    <section aria-labelledby="architecture-heading" className="border-y border-white/[0.06] py-16 sm:py-20"><Reveal><div className="max-w-2xl"><p className="hs-caption uppercase tracking-[0.14em] text-sky-300">A focused platform</p><h2 id="architecture-heading" className="hs-heading mt-3">Complex intelligence, presented with clarity.</h2><p className="mt-3 text-sm leading-6 text-slate-400">HireSense connects the systems that process your material with a single goal: provide grounded insight you can use.</p></div><div className="mt-10 flex flex-col items-center sm:flex-row sm:flex-wrap sm:justify-center">{architecture.map((item, index) => <React.Fragment key={item}><div className="rounded-md border border-white/[0.06] bg-hs-surface px-4 py-3 text-center hs-code text-slate-200">{item}</div>{index < architecture.length - 1 && <Arrow />}</React.Fragment>)}</div></Reveal></section>

    <section aria-labelledby="why-heading" className="py-16 sm:py-24"><div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]"><Reveal><p className="hs-caption uppercase tracking-[0.14em] text-sky-300">Why HireSense</p><h2 id="why-heading" className="hs-heading mt-3">Career guidance you can interrogate.</h2><p className="mt-4 text-sm leading-6 text-slate-400">The platform makes recommendations visible, traceable, and useful—so you can decide what to do next with confidence.</p></Reveal><div className="divide-y divide-white/[0.06] border-y border-white/[0.06]"><>{differentiators.map(([title, copy], index) => <Reveal key={title} delay={index * 0.04}><article className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr]"><h3 className="text-sm font-semibold text-slate-100">{title}</h3><p className="text-sm leading-6 text-slate-400">{copy}</p></article></Reveal>)}</></div></div></section>

    <Reveal><section className="border border-white/[0.06] bg-hs-surface-raised px-6 py-12 text-center sm:px-12 sm:py-16"><p className="hs-caption uppercase tracking-[0.14em] text-sky-300">Begin with what you already have</p><h2 className="hs-heading mx-auto mt-3 max-w-2xl">Bring your experience into focus.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">Upload a resume to begin a clearer path from your current experience to the opportunities you want next.</p><Button size="lg" className="mt-7" onClick={() => navigate('/resume')}>Begin Your Career Journey</Button></section></Reveal>
  </div>;
}
