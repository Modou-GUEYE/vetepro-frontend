import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, LogOut } from 'lucide-react';
import { useCan } from '@/core/auth/permissions';
import { useLogout } from '@/modules/auth/viewmodels/useLogout';
import { useSessionStore } from '@/core/auth/session.store';
import { useForumUnread } from '@/modules/forum/viewmodels/useForumViewModel';
import { useEpidemiesActives } from '@/modules/reseau/viewmodels/useEpidemioViewModel';
import { NAV, NAV_ASSO } from './navigation';

/** Pastille du Forum : nombre de publications non lues. */
function ForumBadge() {
  const n = useForumUnread();
  return n > 0 ? <span aria-label={`${n} publication${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}`} className="ml-auto flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] font-bold leading-none text-white">{n > 9 ? '9+' : n}</span> : null;
}

/** Pastille de la Veille épidémio : foyers actifs. */
function EpidemioBadge() {
  const n = useEpidemiesActives();
  return n > 0 ? <span aria-label={`${n} foyer${n > 1 ? 's' : ''} actif${n > 1 ? 's' : ''}`} className="ml-auto flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] font-bold leading-none text-white">{n > 9 ? '9+' : n}</span> : null;
}

const AVATAR = { admin: 'bg-danger', veterinaire: 'bg-brand', assistant: 'bg-info' } as Record<string, string>;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useSessionStore((s) => s.user);
  const can = useCan();
  const logout = useLogout();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const asso = user?.role === 'super_admin';

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-gradient-to-b from-deep to-[#0a2227] text-white shadow-[4px_0_24px_rgba(11,42,48,.12)] transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative border-b border-white/[.07] py-[22px] pl-[70px] pr-5">
          <span className="absolute left-[22px] top-5 h-[38px] w-[38px] rounded-xl bg-gradient-to-br from-[#2fc3bd] to-brand shadow-[0_6px_16px_rgba(18,160,157,.38)]" />
          <span className="absolute left-[34px] top-8 h-3.5 w-3.5 rounded-[50%_50%_50%_8px] bg-white" />
          <h1 className="text-[21px] font-extrabold leading-tight">Véte<span className="text-brand-accent">Pro</span></h1>
          <p className="mt-[3px] text-[10px] uppercase tracking-[1.4px] text-white/45">{asso ? 'Association' : 'Cabinet Vétérinaire'}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3.5 pt-2.5">
          {(asso ? NAV_ASSO : NAV).map((g) => ({ ...g, items: g.items.filter((i) => !i.module || can(i.module)) }))
            .filter((g) => g.items.length > 0)
            .map((g) => (
            <div key={g.id}>
              {g.label ? <button
                type="button"
                disabled={!g.collapsible}
                onClick={() => g.collapsible && setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                className="flex w-full items-center justify-between px-3 pb-1.5 pt-[18px] text-left text-[10.5px] font-bold uppercase tracking-[1.3px] text-white/[.34]"
              >
                {g.label}
                {g.collapsible && <ChevronDown size={12} className={clsx('transition', collapsed[g.id] && '-rotate-90')} />}
              </button> : <div className="pt-3" />}
              {!collapsed[g.id] &&
                g.items.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/' || path === '/association'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'relative my-px flex items-center gap-[11px] rounded-[10px] px-3 py-[9px] text-[13.5px] transition',
                        isActive
                          ? 'bg-gradient-to-r from-[rgba(47,195,189,.26)] to-[rgba(47,195,189,.08)] font-semibold text-white ring-1 ring-inset ring-[rgba(95,224,214,.18)]'
                          : 'text-white/[.66] hover:bg-white/[.07] hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-3 bottom-[9px] top-[9px] w-1 rounded-r bg-brand-accent" />}
                        <Icon size={18} className={isActive ? 'text-brand-accent' : 'opacity-90'} />
                        {label}
                        {path === '/forum' && <ForumBadge />}
                        {path === '/veille-epidemio' && <EpidemioBadge />}
                      </>
                    )}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 bg-black/[.18] px-[18px] py-3.5">
          <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white/[.18]', AVATAR[user?.role ?? ''] ?? 'bg-brand')}>
            {user?.nom.split(' ').map((p) => p[0]).slice(0, 2).join('') ?? '?'}
          </div>
          <Link to="/mon-compte" onClick={onClose} title="Mon compte" className="min-w-0 flex-1 rounded-lg transition hover:bg-white/5">
            <div className="truncate text-[13px] font-semibold">{user?.nom ?? 'Non connecté'}</div>
            <div className="text-[11px] text-white/40">{user?.profil ?? ''}</div>
          </Link>
          <button onClick={logout} title="Se déconnecter" aria-label="Se déconnecter" className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
