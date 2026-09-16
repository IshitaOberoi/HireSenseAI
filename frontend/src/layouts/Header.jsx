import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NavigationLink } from './NavigationLink';
import { Button } from '../components/ui/Button';

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/resume', label: 'Resume' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/mockprep', label: 'MockPrep' },
  { to: '/roadmap', label: 'Career Roadmap' },
];

export function Header({ onOpenCommandPalette, commandButtonRef }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);
  return <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-hs-canvas/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
      <Link to="/dashboard" aria-label="HireSense AI dashboard" className="hs-interactive flex shrink-0 items-center gap-2 rounded-md text-white">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-hs-primary text-sm font-extrabold" aria-hidden="true">H</span>
        <span className="hidden text-sm font-bold tracking-tight sm:inline">HireSense AI</span>
      </Link>
      <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">{navigation.map((item) => <NavigationLink key={item.to} to={item.to}>{item.label}</NavigationLink>)}</nav>
      <div className="ml-auto flex items-center gap-2">
        <Button ref={commandButtonRef} variant="ghost" size="sm" onClick={onOpenCommandPalette} aria-label="Open command palette">
          <span className="hidden sm:inline">Search</span><kbd className="rounded border border-white/[0.1] px-1.5 py-0.5 hs-code text-slate-400">⌘ K</kbd>
        </Button>
        <Link to="/profile" aria-label="Open profile" className="hs-interactive grid h-8 w-8 place-items-center rounded-full border border-white/[0.1] bg-hs-surface-raised text-xs font-semibold text-slate-200">IS</Link>
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="mobile-navigation">{mobileOpen ? 'Close' : 'Menu'}</Button>
      </div>
    </div>
    {mobileOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-white/[0.06] px-4 py-2 lg:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-1">{navigation.map((item) => <NavigationLink key={item.to} to={item.to} onNavigate={closeMobile}>{item.label}</NavigationLink>)}</div></nav>}
  </header>;
}
