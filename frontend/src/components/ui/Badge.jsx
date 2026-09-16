import React from 'react';
import { cx } from './utils';

const tones = { neutral: 'border-white/[0.08] bg-white/[0.04] text-slate-300', info: 'border-sky-400/20 bg-sky-400/10 text-sky-300', success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300', warning: 'border-amber-400/20 bg-amber-400/10 text-amber-300', danger: 'border-red-400/20 bg-red-400/10 text-red-300' };
export function Badge({ tone = 'neutral', className, children }) { return <span className={cx('inline-flex items-center rounded-sm border px-2 py-1 hs-caption', tones[tone], className)}>{children}</span>; }
