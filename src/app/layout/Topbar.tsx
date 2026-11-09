import { Globe, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/core/auth/session.store';
import { ALL_ITEMS, ASSO_ITEMS } from './navigation';
import { NotificationBell } from '@/modules/notifications/views/NotificationBell';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const asso = useSessionStore((s) => s.user?.role === 'super_admin');
  const current = [...ASSO_ITEMS, ...ALL_ITEMS].sort((a, b) => b.path.length - a.path.length).find((i) => (i.path === '/' ? pathname === '/' : pathname.startsWith(i.path)));
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3.5 border-b border-line bg-white/[.88] px-4 backdrop-blur-md sm:px-7">
      <button onClick={onMenu} aria-label="Ouvrir le menu" className="rounded-lg p-2 text-slate hover:bg-mist lg:hidden">
        <Menu size={20} />
      </button>
      <h2 className="truncate font-display text-xl font-bold">{pathname === '/mon-compte' ? 'Mon compte' : (current?.label ?? 'VétéPro')}</h2>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/portail" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate transition hover:bg-mist" title="Retourner au site public de l'association">
          <Globe size={14} /> <span className="hidden sm:inline">Site de l'association</span>
        </Link>
        {!asso && <NotificationBell />}
      </div>
    </header>
  );
}
