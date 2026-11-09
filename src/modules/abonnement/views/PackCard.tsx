import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Pack, Periode, periodSuffix, packPrice } from '../models/abonnement';
import { formatFcfa } from '@/core/utils/format';

/** Carte d'un pack : nom, cible, tarif, engagement, fonctionnalités ; badge « Le plus choisi ». Sélectionnable (étape de l'inscription, renouvellement) ou avec un bouton d'action (portail). */
export function PackCard({ pack, periode, selected, onSelect, action }: { pack: Pack; periode: Periode; selected?: boolean; onSelect?: () => void; action?: React.ReactNode }) {
  const features = pack.fonctionnalites;
  const body = (
    <>
      {pack.star && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3.5 py-1 text-[11px] font-bold text-white shadow-card">Le plus choisi</span>}
      <p className="text-[11px] font-bold uppercase tracking-[1px] text-slate">{pack.cible}</p>
      <h3 className="mt-1 font-serif text-xl font-bold text-deep">{pack.nom}</h3>
      <p className="mt-3 font-serif text-[26px] font-bold leading-none text-ink tabular-nums">{formatFcfa(packPrice(pack, periode))}<span className="ml-1 text-[13px] font-semibold text-slate">/ {periodSuffix(periode)}</span></p>
      {periode === 'annuel' && <p className="mt-1.5 text-xs text-slate">Facturation annuelle</p>}
      <ul className="mt-4 flex-1 space-y-2 text-[13px]">
        {features.map((f) => <li key={f} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-brand" /><span>{f}</span></li>)}
      </ul>
      {action && <div className="mt-5">{action}</div>}
    </>
  );
  const cls = clsx('relative flex flex-col rounded-[22px] border bg-white p-6 text-left transition', pack.star ? 'border-2 border-brand shadow-[0_16px_40px_rgba(14,124,123,.14)]' : 'border-line', selected && 'ring-2 ring-brand ring-offset-2');
  return onSelect ? (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onSelect} className={clsx(cls, 'hover:-translate-y-0.5 hover:shadow-card')}>{body}</button>
  ) : <div className={cls}>{body}</div>;
}
