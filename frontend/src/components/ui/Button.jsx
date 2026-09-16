import React from 'react';
import { cx } from './utils';

const styles = {
  primary: 'bg-hs-primary text-white border border-transparent hover:bg-blue-500',
  secondary: 'bg-hs-surface-raised text-hs-text border border-white/[0.06] hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-300 border border-transparent hover:bg-white/[0.04] hover:text-white',
  danger: 'bg-hs-danger text-white border border-transparent hover:bg-red-400',
};
const sizes = { sm: 'min-h-8 px-3 text-xs', md: 'min-h-10 px-4 text-sm', lg: 'min-h-11 px-5 text-sm' };

export const Button = React.forwardRef(function Button({ asChild = false, className, variant = 'primary', size = 'md', type = 'button', loading = false, children, disabled, ...props }, ref) {
  const buttonClass = cx('hs-interactive inline-flex items-center justify-center gap-2 rounded-md font-semibold', styles[variant], sizes[size], (disabled || loading) && 'opacity-50', className);
  if (asChild && React.isValidElement(children)) return React.cloneElement(children, { ...props, ref, className: cx(buttonClass, children.props.className), 'aria-busy': loading || undefined, 'aria-disabled': disabled || loading || undefined });
  return <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass} {...props}>
    {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
    {children}
  </button>;
});
