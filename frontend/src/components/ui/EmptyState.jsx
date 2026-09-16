import React from 'react';
import { Button } from './Button';
import { cx } from './utils';

export function EmptyState({ title, description, actionLabel, onAction, icon, className }) {
  return <section className={cx('hs-surface flex min-h-56 flex-col items-center justify-center rounded-lg px-6 py-10 text-center', className)}>{icon && <div className="mb-4 text-sky-300" aria-hidden="true">{icon}</div>}<h2 className="hs-title">{title}</h2><p className="mt-2 max-w-md hs-body text-slate-400">{description}</p>{actionLabel && <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>}</section>;
}
