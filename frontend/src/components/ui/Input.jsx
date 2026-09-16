import React, { useId } from 'react';
import { cx } from './utils';

const base = 'w-full rounded-md border border-white/[0.08] bg-hs-canvas px-3 py-2.5 text-sm text-hs-text placeholder:text-slate-500 transition-colors focus:border-sky-400/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';
export function Field({ label, hint, error, id, className, children }) { const generatedId = useId(); const fieldId = id || generatedId; return <div className={cx('space-y-1.5', className)}>{label && <label htmlFor={fieldId} className="block hs-caption text-slate-300">{label}</label>}{React.cloneElement(children, { id: fieldId, 'aria-describedby': hint || error ? `${fieldId}-message` : undefined, 'aria-invalid': Boolean(error) || undefined })}{(hint || error) && <p id={`${fieldId}-message`} className={cx('hs-caption', error ? 'text-red-300' : 'text-slate-400')}>{error || hint}</p>}</div>; }
export const Input = React.forwardRef(function Input({ className, ...props }, ref) { return <input ref={ref} className={cx(base, className)} {...props} />; });
export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) { return <textarea ref={ref} className={cx(base, 'min-h-28 resize-y', className)} {...props} />; });
