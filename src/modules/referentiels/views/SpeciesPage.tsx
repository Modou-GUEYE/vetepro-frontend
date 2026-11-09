import clsx from 'clsx';
import { Check, Eye, Info, Search, X } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Drawer, Input, KpiCard, Panel, Skeleton } from '@/shared/ui';
import { Espece } from '../models/referentiels';
import { useSpeciesViewModel } from '../viewmodels/useSpeciesViewModel';

const FILTERS = [['all', 'Toutes'], ['actif', 'Actives'], ['inactif', 'Inactives']] as const;
const MAX_CHIPS = 4;

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={clsx('relative h-[22px] w-10 shrink-0 rounded-full transition', on ? 'bg-brand' : 'bg-[#cbd6dd]')}>
      <span className={clsx('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all', on ? 'left-5' : 'left-0.5')} />
    </button>
  );
}

function RaceChips({ e }: { e: Espece }) {
  const shown = e.races.slice(0, MAX_CHIPS);
  const more = e.races.length - shown.length;
  if (e.races.length === 0) return <span className="text-faint">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((r) => <span key={r.id} className={clsx('rounded-full px-2.5 py-0.5 text-[11.5px] font-medium', r.actif ? 'bg-brand-pale text-brand-text' : 'bg-slate-soft text-faint line-through')}>{r.nom}</span>)}
      {more > 0 && <span className="rounded-full bg-mist px-2 py-0.5 text-[11.5px] text-slate">+{more}</span>}
    </div>
  );
}

export function SpeciesPage() {
  const vm = useSpeciesViewModel();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard value={vm.kpis.total} label="Espèces" />
        <KpiCard value={vm.kpis.actives} label="Actives" />
        <KpiCard value={vm.kpis.inactives} label="Inactives" tone="amber" />
        <KpiCard value={vm.kpis.racesActives} label="Races actives" tone="info" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher une espèce ou une race" placeholder="Rechercher une espèce, une race…" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => vm.setFilter(k)} aria-pressed={vm.filter === k}
              className={clsx('rounded-full border px-3.5 py-1.5 text-xs font-semibold', vm.filter === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-slate hover:border-brand')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Panel title="Espèces & races du référentiel" count={`${vm.species.length} espèce${vm.species.length > 1 ? 's' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>{['Espèce', 'Description', 'Races', 'Gestation', 'Vaccins recommandés', 'Statut', 'Actions'].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {vm.loading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>)}
              {!vm.loading && vm.species.map((e) => (
                <tr key={e.id} className="hover:bg-[#f7fafb]">
                  <td className="border-b border-[#eef2f5] px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-sm font-bold text-brand-text">{e.nom[0]}</span>
                      <div><div className="font-semibold">{e.nom}</div><div className="text-xs text-faint">{e.races.filter((r) => r.actif).length}/{e.races.length} races actives</div></div>
                    </div>
                  </td>
                  <td className="max-w-[200px] border-b border-[#eef2f5] px-4 py-3.5 align-middle text-[13px] text-slate">{e.description}</td>
                  <td className="min-w-[220px] border-b border-[#eef2f5] px-4 py-3.5 align-middle"><RaceChips e={e} /></td>
                  <td className="whitespace-nowrap border-b border-[#eef2f5] px-4 py-3.5 align-middle text-[13px]">{e.gestationJours ? `${e.gestationJours} j` : <span className="text-faint">—</span>}</td>
                  <td className="max-w-[220px] border-b border-[#eef2f5] px-4 py-3.5 align-middle text-xs text-slate">{e.vaccins}</td>
                  <td className="border-b border-[#eef2f5] px-4 py-3.5 align-middle"><Badge tone={e.actif ? 'green' : 'red'}>{e.actif ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="border-b border-[#eef2f5] px-4 py-3.5 align-middle">
                    <div className="flex gap-1.5">
                      <Button size="icon" variant="info" title="Voir les races et la gestation" aria-label={`Voir ${e.nom}`} onClick={() => vm.openDetail(e.id)}><Eye size={14} /></Button>
                      {vm.canEdit && (e.actif
                        ? <Button size="icon" variant="danger" title="Désactiver" aria-label={`Désactiver ${e.nom}`} disabled={vm.busy} onClick={() => vm.requestToggle(e)}><X size={14} /></Button>
                        : <Button size="icon" variant="success" title="Activer" aria-label={`Activer ${e.nom}`} disabled={vm.busy} onClick={() => vm.requestToggle(e)}><Check size={14} /></Button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!vm.loading && vm.species.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate">Aucune espèce ne correspond.</p>}
        </div>
      </Panel>

      <Drawer open={vm.drawerOpen && !!vm.selected} onClose={vm.closeDetail} title={vm.selected ? `${vm.selected.nom} : races et gestation` : ''}>
        {vm.selected && (
          <div className="space-y-6">
            <p className="flex items-start gap-2 text-xs text-slate">
              <Info size={14} className="mt-px shrink-0 text-brand" />
              <span>Une espèce inactive n'est plus proposée lors de l'ajout d'un patient ou d'une prise de rendez-vous. Une race inactive n'est plus proposée pour cette espèce.</span>
            </p>
            <form onSubmit={(e) => { e.preventDefault(); if (vm.gestationDirty && !vm.gestationError) vm.saveGestation(); }} className="space-y-2">
              <div className="flex items-end gap-3">
                <Input label="Durée de gestation (jours)" inputMode="numeric" wrapperClassName="w-52" value={vm.gestation} disabled={!vm.canEdit}
                  onChange={(e) => vm.setGestation(e.target.value)} error={vm.gestationError} hint="Vide si non applicable" />
                {vm.canEdit && <Button type="submit" disabled={!vm.gestationDirty || !!vm.gestationError} loading={vm.savingGestation}>Enregistrer</Button>}
              </div>
              <p className="text-xs text-faint">Valeurs de départ de la spécification, à faire valider par un vétérinaire. Elles servent à calculer la date de mise-bas prévue.</p>
            </form>
            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Races ({vm.activeRaces}/{vm.selected.races.length} actives)</h4>
              {vm.selected.races.length === 0 && <p className="text-sm text-slate">Aucune race dans le référentiel.</p>}
              <ul className="rounded-md2 border border-line">
                {vm.selected.races.map((r) => (
                  <li key={r.id} className="flex items-center justify-between border-b border-[#eef2f5] px-4 py-2.5 last:border-0">
                    <span className={clsx('text-[13px]', !r.actif && 'text-faint')}>{r.nom}</span>
                    {vm.canEdit ? <Switch on={r.actif} label={`${r.actif ? 'Désactiver' : 'Activer'} la race ${r.nom}`} onClick={() => vm.toggleRace(r)} />
                      : <Badge tone={r.actif ? 'green' : 'slate'}>{r.actif ? 'Active' : 'Inactive'}</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!vm.confirmOff} danger loading={vm.busy} title="Désactiver l'espèce" confirmLabel="Désactiver"
        message={vm.confirmOff ? `« ${vm.confirmOff.nom} » ne sera plus proposée lors de l'ajout d'un patient ou d'un rendez-vous. Les dossiers existants sont conservés.` : ''}
        onConfirm={vm.confirmDeactivate} onCancel={vm.cancelOff}
      />
    </div>
  );
}
