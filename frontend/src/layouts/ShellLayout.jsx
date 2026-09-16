import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { PageContainer } from './PageContainer';
import { CommandPalette } from '../components/command/CommandPalette';
import { FloatingAiAssistant } from '../components/assistant/FloatingAiAssistant';

export function ShellLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false); const [assistantOpen, setAssistantOpen] = useState(false); const commandButtonRef = useRef(null);
  useEffect(() => { const handler = (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true); } }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);
  return <div className="min-h-screen bg-hs-canvas text-hs-text"><a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] rounded-md bg-hs-primary px-3 py-2 text-sm text-white">Skip to content</a><Header onOpenCommandPalette={() => setPaletteOpen(true)} commandButtonRef={commandButtonRef} /><PageContainer><Outlet /></PageContainer><FloatingAiAssistant open={assistantOpen} onOpen={() => setAssistantOpen(true)} onClose={() => setAssistantOpen(false)} /><CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenAssistant={() => setAssistantOpen(true)} returnFocusRef={commandButtonRef} /></div>;
}
