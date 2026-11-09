import { formatFcfa } from '@/core/utils/format';
import { Chart } from '../models/report';

const fmt = (c: Chart, v: number) => (c.format === 'fcfa' ? formatFcfa(v) : String(v));

/** Graphiques simples (barres horizontales ou colonnes), lisibles sans bibliothèque ; chaque valeur est écrite en toutes lettres. */
export function ChartBlock({ chart }: { chart: Chart }) {
  const max = Math.max(1, ...chart.donnees.map((d) => d.valeur));
  return (
    <div>
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">{chart.titre}</h4>
      {chart.donnees.length === 0 ? <p className="text-[13px] text-slate">Aucune donnée</p> : chart.type === 'barres' ? (
        <ul className="space-y-2">
          {chart.donnees.slice(0, 8).map((d) => (
            <li key={d.label} className="text-[13px]">
              <div className="flex justify-between gap-3"><span className="truncate">{d.label}</span><b className="shrink-0 tabular-nums">{fmt(chart, d.valeur)}</b></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-brand" style={{ width: `${(d.valeur / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-36 items-end gap-2" role="img" aria-label={chart.titre}>
          {chart.donnees.map((d) => (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] font-semibold tabular-nums">{d.valeur}</span>
              <div className="w-full rounded-t bg-brand" style={{ height: `${Math.max(4, (d.valeur / max) * 100)}px` }} />
              <span className="w-full truncate text-center text-[10px] text-slate">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
