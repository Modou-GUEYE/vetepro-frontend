import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { AtSign, Baby, TriangleAlert, Bell, CalendarDays, HeartPulse, Pill, Syringe } from 'lucide-react';
import { since } from '../models/notification';
import { useNotificationsViewModel } from '../viewmodels/useNotificationsViewModel';

const ICON = { rdv: CalendarDays, stock: Pill, hospitalisation: HeartPulse, insemination: Baby, vaccination: Syringe, mention: AtSign, epidemie: TriangleAlert } as const;

export function NotificationBell() {
  const vm = useNotificationsViewModel();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!vm.open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) vm.close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') vm.close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [vm.open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative">
      <button onClick={vm.toggle} aria-label={vm.unread ? `Notifications, ${vm.unread} non lue${vm.unread > 1 ? 's' : ''}` : 'Notifications'} aria-expanded={vm.open}
        className="relative rounded-lg p-2 text-slate transition hover:bg-mist hover:text-ink">
        <Bell size={20} />
        {vm.unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">{vm.unread > 9 ? '9+' : vm.unread}</span>}
      </button>
      {vm.open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-30 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-[14px] font-bold">Notifications</h3>
            <button onClick={vm.markAll} disabled={vm.unread === 0} className="text-xs font-semibold text-brand hover:underline disabled:text-faint disabled:no-underline">Tout marquer comme lu</button>
          </div>
          <ul className="max-h-[380px] overflow-y-auto">
            {vm.items.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-slate">Aucune notification</li>}
            {vm.items.map((n) => {
              const Icon = ICON[n.type];
              return (
                <li key={n.id}>
                  <button onClick={() => vm.openItem(n)} className={clsx('flex w-full gap-3 border-b border-[#eef2f5] px-4 py-3 text-left transition hover:bg-mist', !n.lu && 'bg-brand-pale/40')}>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-pale text-brand-text"><Icon size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><b className="truncate text-[13px]">{n.titre}</b>{!n.lu && <span aria-label="Non lue" className="h-2 w-2 shrink-0 rounded-full bg-brand" />}</span>
                      <span className="block text-[12.5px] text-slate">{n.message}</span>
                      <span className="mt-0.5 block text-[11px] text-faint">{since(n.date)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
