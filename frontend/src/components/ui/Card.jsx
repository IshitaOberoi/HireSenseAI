import React from 'react';
import { cx } from './utils';

export function Card({ className, children, interactive = false, ...props }) {
  return <section className={cx('hs-surface rounded-lg', interactive && 'hs-interactive hover:border-white/[0.12]', className)} {...props}>{children}</section>;
}
export function CardHeader({ className, children }) { return <div className={cx('flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4', className)}>{children}</div>; }
export function CardBody({ className, children }) { return <div className={cx('p-5', className)}>{children}</div>; }
export function CardFooter({ className, children }) { return <div className={cx('flex items-center gap-3 border-t border-white/[0.06] px-5 py-4', className)}>{children}</div>; }
