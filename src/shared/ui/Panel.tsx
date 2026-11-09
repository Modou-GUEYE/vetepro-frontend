import { ReactNode } from 'react';
import clsx from 'clsx';

/** Carte avec en-tête (titre, compteur, actions), comme les panneaux du prototype V4. */
export function Panel({ title, count, actions, children, className }: { title: string; count?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('overflow-hidden rounded-lg2 border border-line bg-white shadow-card', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-line bg-gradient-to-b from-white to-[#fbfcfd] px-5 py-[15px]">
        <h3 className="text-[15px] font-bold">{title}</h3>
        <div className="flex items-center gap-3">
          {actions}
          {count !== undefined && <span className="text-xs text-slate">{count}</span>}
        </div>
      </header>
      {children}
    </section>
  );
}

const accents = { brand: 'from-brand-light to-brand', info: 'from-[#4d8cf0] to-info', amber: 'from-[#d98a1c] to-amber', violet: 'from-[#8472e0] to-violet' } as const;

/** Indicateur chiffré avec barre d'accent à gauche (carte KPI de V4). */
export function KpiCard({ value, label, tone = 'brand' }: { value: ReactNode; label: string; tone?: keyof typeof accents }) {
  return (
    <div className="relative overflow-hidden rounded-lg2 border border-line bg-white px-5 py-[18px] shadow-card transition hover:-translate-y-0.5">
      <span className={clsx('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', accents[tone])} />
      <div className="font-display text-[28px] font-extrabold leading-tight tabular-nums">{value}</div>
      <div className="mt-1 text-[12.5px] font-medium text-slate">{label}</div>
    </div>
  );
}
