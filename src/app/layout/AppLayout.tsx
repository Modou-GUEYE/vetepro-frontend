import { useState } from 'react';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useSessionSync } from '../useSessionSync';
import { TrialBanner } from '@/modules/abonnement/views/TrialBanner';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  useSessionSync();
  return (
    <div className="flex h-screen overflow-hidden bg-mist">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-7">
          <Suspense fallback={<p className="p-6 text-sm text-slate-500">Chargement…</p>}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
