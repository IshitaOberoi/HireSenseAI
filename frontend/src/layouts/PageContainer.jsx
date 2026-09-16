import React from 'react';
import { cx } from '../components/ui/utils';

export function PageContainer({ children, className }) {
  return <main id="main-content" className={cx('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>{children}</main>;
}
