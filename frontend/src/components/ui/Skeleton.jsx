import React from 'react';
import { cx } from './utils';

export function Skeleton({ className, label = 'Loading' }) { return <div className={cx('hs-skeleton rounded-md', className)} role="status" aria-label={label}><span className="sr-only">{label}</span></div>; }
export function SkeletonLines({ lines = 3, className }) { return <div className={cx('space-y-2', className)} aria-label="Loading content" role="status">{Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={index === lines - 1 ? 'h-3 w-2/3' : 'h-3 w-full'} />)}<span className="sr-only">Loading content</span></div>; }
