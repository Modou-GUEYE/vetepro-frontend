import clsx from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { Badge, Button, Input, Panel, Select } from '@/shared/ui';
import { useVeterinaireChoices } from '../viewmodels/useVeterinaireChoices';
import { PlanningView, RdvRow, STATUS_LABEL, STATUS_TONE, dayLabel, endTime, monthLabel, parseDay, weekLabel } from '../models/rdv';
import { useRdvViewModel } from '../viewmodels/useRdvViewModel';
import { RdvDetailModal } from './RdvDetailModal';
import { RdvFormModal } from './RdvFormModal';

const VIEWS: { key: PlanningView; label: string }[] = [{ key: 'mois', label: 'Mois' }, { key: 'semaine', label: 'Semaine' }, { key: 'liste', label: 'Liste' }];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DOT: Record<RdvRow['statut'], string> = { confirme: 'bg-brand', termine: 'bg-slate', annule: 'bg-danger' };
const CHIP: Record<RdvRow['statut'], string> = { confirme: 'bg-brand-pale text-brand-text', termine: 'bg-slate-soft text-slate-text', annule: 'bg-danger-pale text-danger-text line-through' };

function RdvCard({ r, onOpen }: { r: RdvRow; onOpen: (id: string) => void }) {
  return (
    <button onClick={() => onOpen(r.id)} className="flex w-full gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-brand/40 hover:shadow-card">
      <span className="w-14 shrink-0 text-center"><b className="block text-[15px]">{r.heure}</b><span className="text-[11px] text-slate">{endTime(r.heure, r.duree)}</span></span>
      <span className="min-w-0 flex-1">
        <span className={clsx('block truncate text-[13.5px] font-semibold', r.statut === 'annule' && 'line-through')}>{r.patient?.nom ?? '?'}{r.motif ? `, ${r.motif}` : ''}</span>
        <span className="block truncate text-xs text-slate">{[r.proprietaire?.nom, r.veterinaire.nom].filter(Boolean).join(', ')}</span>
        {r.patient?.provisoire && <span className="text-[11px] font-semibold text-amber-text">Nouvel animal</span>}
      </span>
      <Badge tone={STATUS_TONE[r.statut]} className="self-start">{STATUS_LABEL[r.statut]}</Badge>
    </button>
  );
}

export function RdvPage() {
  const vm = useRdvViewModel();
  const vets = useVeterinaireChoices();
  const month = vm.view !== 'semaine';
  const dayRows = vm.byDay.get(vm.selectedDay) ?? [];
  const headLabel = vm.view === 'semaine' ? weekLabel(vm.anchor) : monthLabel(vm.anchor);
  const anchorMonth = parseDay(vm.anchor).getMonth();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {vm.canCreate && <Button onClick={() => vm.openCreate(vm.selectedDay >= vm.today ? vm.selectedDay : vm.today)}><Plus size={15} /> Nouveau rendez-vous</Button>}
        <div role="tablist" aria-label="Vue du planning" className="inline-flex overflow-hidden rounded-lg border border-line text-[13px] font-semibold">
          {VIEWS.map((v) => (
            <button key={v.key} role="tab" aria-selected={vm.view === v.key} onClick={() => vm.setView(v.key)} className={clsx('px-3.5 py-2 transition', vm.view === v.key ? 'bg-brand text-white' : 'bg-white text-slate hover:bg-mist')}>{v.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="secondary" aria-label="Précédent" onClick={vm.prev}><ChevronLeft size={15} /></Button>
          <span aria-live="polite" className="min-w-[150px] text-center text-sm font-semibold">{headLabel}</span>
          <Button size="icon" variant="secondary" aria-label="Suivant" onClick={vm.next}><ChevronRight size={15} /></Button>
          <Button size="sm" variant="secondary" className="ml-1" onClick={vm.goToday}>Aujourd'hui</Button>
        </div>
        <Select aria-label="Filtrer par vétérinaire" wrapperClassName="w-52" value={vm.vet} onChange={(e) => vm.setVet(e.target.value)}>
          <option value="">Tous les vétérinaires</option>{(vets.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </Select>
        {vm.view === 'liste' && (
          <>
            <Select aria-label="Filtrer par statut" wrapperClassName="w-40" value={vm.statut} onChange={(e) => vm.setStatut(e.target.value)}>
              <option value="">Tous les statuts</option>{(['confirme', 'termine', 'annule'] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
              <Input aria-label="Rechercher un rendez-vous" placeholder="Rechercher (animal, propriétaire, motif)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate" aria-label="Légende">
        {(['confirme', 'termine', 'annule'] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={clsx('h-2.5 w-2.5 rounded-full', DOT[s])} />{STATUS_LABEL[s]}</span>)}
      </div>

      {month && vm.view === 'mois' && (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          <section className="rounded-lg2 border border-line bg-white p-3 shadow-card">
            <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate">{WEEKDAYS.map((d) => <div key={d} className="py-1.5">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {vm.grid.map((day) => {
                const list = (vm.byDay.get(day) ?? []).filter((r) => r.statut !== 'annule');
                const inMonth = parseDay(day).getMonth() === anchorMonth;
                return (
                  <button key={day} onClick={() => vm.setSelectedDay(day)} aria-label={`${dayLabel(day)}, ${list.length} rendez-vous`} aria-pressed={day === vm.selectedDay}
                    className={clsx('min-h-[84px] rounded-lg border p-1.5 text-left transition hover:border-brand/40', day === vm.selectedDay ? 'border-brand bg-brand-pale/50' : 'border-transparent bg-[#fbfcfd]', !inMonth && 'opacity-45')}>
                    <span className={clsx('inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold', day === vm.today && 'bg-brand text-white')}>{parseDay(day).getDate()}</span>
                    {list.slice(0, 2).map((r) => <span key={r.id} className={clsx('mt-0.5 block truncate rounded px-1 text-[10.5px] font-medium', CHIP[r.statut])}>{r.heure} {r.patient?.nom}</span>)}
                    {list.length > 2 && <span className="mt-0.5 block text-[10.5px] font-semibold text-amber-text">+{list.length - 2}</span>}
                  </button>
                );
              })}
            </div>
          </section>
          <Panel title={dayLabel(vm.selectedDay)} count={dayRows.length ? `${dayRows.length} rendez-vous` : undefined}>
            <div className="space-y-2 p-4">
              {dayRows.length === 0 && <div className="py-8 text-center text-[13px] text-slate"><CalendarDays className="mx-auto mb-2 text-faint" />Aucun rendez-vous ce jour</div>}
              {dayRows.map((r) => <RdvCard key={r.id} r={r} onOpen={vm.openDetail} />)}
              {vm.canCreate && vm.selectedDay >= vm.today && <Button variant="secondary" size="sm" className="w-full" onClick={() => vm.openCreate(vm.selectedDay)}><Plus size={13} /> Rendez-vous ce jour</Button>}
            </div>
          </Panel>
        </div>
      )}

      {vm.view === 'semaine' && (
        <div className="grid gap-2 md:grid-cols-7">
          {vm.weekDays.map((day) => {
            const list = vm.byDay.get(day) ?? [];
            return (
              <section key={day} aria-label={dayLabel(day)} className={clsx('min-h-[160px] rounded-lg2 border bg-white p-2 shadow-card', day === vm.today ? 'border-brand' : 'border-line')}>
                <h3 className="mb-2 text-center text-[12px] font-bold">{dayLabel(day).replace(/^(\p{L}+)/u, (w) => w.slice(0, 3) + '.')}</h3>
                <div className="space-y-1.5">
                  {list.length === 0 && <p className="py-4 text-center text-[11.5px] text-faint">Libre</p>}
                  {list.map((r) => (
                    <button key={r.id} onClick={() => vm.openDetail(r.id)} className={clsx('block w-full rounded-lg px-2 py-1.5 text-left text-[11.5px] font-medium', CHIP[r.statut])}>
                      <b>{r.heure}</b> {r.patient?.nom}<span className="block truncate opacity-80">{r.veterinaire.nom}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {vm.view === 'liste' && (
        <Panel title="Rendez-vous" count={vm.rows.length}>
          {vm.rows.length === 0 && !vm.loading ? <p className="p-8 text-center text-[13px] text-slate">Aucun rendez-vous sur cette période</p> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>{['Date', 'Heure', 'Animal', 'Propriétaire', 'Vétérinaire', 'Motif', 'Statut'].map((h) => <th key={h} className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{h}</th>)}</tr></thead>
                <tbody>
                  {vm.rows.map((r) => (
                    <tr key={r.id} onClick={() => vm.openDetail(r.id)} className="cursor-pointer border-b border-[#eef2f5] hover:bg-mist">
                      <td className="whitespace-nowrap px-4 py-3">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{r.heure}</td>
                      <td className="px-4 py-3 font-semibold">{r.patient?.nom}</td>
                      <td className="px-4 py-3">{r.proprietaire?.nom}</td>
                      <td className="whitespace-nowrap px-4 py-3">{r.veterinaire.nom}</td>
                      <td className="px-4 py-3">{r.motif || <span className="text-faint">Non précisé</span>}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <RdvFormModal open={!!vm.creating || !!vm.editing} editing={vm.editing} date={vm.creating?.date} onClose={() => { vm.closeCreate(); vm.closeEdit(); }}
        onSaved={(id) => { vm.closeCreate(); vm.closeEdit(); vm.openDetail(id); }} />
      {vm.detailId && !vm.editing && <RdvDetailModal id={vm.detailId} onClose={vm.closeDetail} onEdit={() => { const r = vm.rows.find((x) => x.id === vm.detailId); if (r) vm.openEdit(r); }} />}
    </div>
  );
}
