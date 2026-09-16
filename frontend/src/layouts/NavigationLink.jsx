import React from 'react';
import { NavLink } from 'react-router-dom';
import { cx } from '../components/ui/utils';

export function NavigationLink({ to, children, onNavigate, className }) {
  return <NavLink to={to} onClick={onNavigate} className={({ isActive }) => cx('hs-interactive rounded-md px-3 py-2 text-sm font-medium', isActive ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100', className)}>{children}</NavLink>;
}
