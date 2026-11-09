import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Check, Eye, Search, TriangleAlert } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, EmptyState, Input, KpiCard, Modal, Select, Skeleton, Textarea } from '@/shared/ui';
import { EPI_STATUT_LABEL, EPI_STATUT_TONE, Epidemie, EpiForm, GRAVITES, GRAVITE_LABEL, GRAVITE_TONE, emptyEpiForm, epiFormSchema } from '../models/reseau';
import { useEpidemioViewModel } from '../viewmodels/useEpidemioViewModel';

const th = 'border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate';

/** Veille épidémiologique du réseau : foyers signalés par les établissements, alerte automatique quand deux établissements signalent la même maladie dans la même zone. */
export function EpidemioPage() {
  const vm = useEpidemioViewModel();
  const s = vm.stats;
  const filtered = vm.filters.q !== '' || vm.filters.gravite !== '';
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 rounded-lg2 border border-line bg-gradient-to-r from-danger-pale to-white px-5 py-[18px]">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-danger text-white"><TriangleAlert size={24} /></span>
        <div className="flex-1">
          <h3 className="font-serif text-[17px] font-bold text-deep">Veille épidémiologique du réseau</h3>
          <p className="max-w-[640px] text-[13px] text-slate">Signalez les foyers de maladie. Quand plusieurs établissements signalent la même pathologie dans une zone, une alerte réseau se déclenche automatiquement.</p>
        </div>
        {vm.canReport && <Button onClick={vm.openComposer}><TriangleAlert size={15} /> Signaler un foyer</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard value={s?.actifs ?? 0} label="Foyers actifs" />
        <KpiCard value={s?.cas ?? 0} label="Cas cumulés" tone="amber" />
        <KpiCard value={s?.localites ?? 0} label="Localités touchées" tone="info" />
        <KpiCard value={s?.signalements ?? 0} label="Signalements" tone="violet" />
      </div>

      {vm.alertes.map((a) => (
        <div key={`${a.maladie}-${a.ville}`} role="alert" className="flex items-start gap-3 rounded-lg2 border border-danger/30 bg-danger-pale px-4 py-3 text-danger-text">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p className="text-[13px]"><b>Alerte réseau, {a.maladie} à {a.ville}.</b> {a.foyers} foyers signalés, {a.cas} cas cumulés. Vigilance renforcée recommandée dans la zone.</p>
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-3 rounded-lg2 border border-line bg-white px-4 py-3">
        <div className="relative min-w-[220px] flex-[2]">
          <Search size={15} className="pointer-events-none absolute left-3 top-[34px] text-faint" />
          <Input label="Recherche" className="pl-9" placeholder="Maladie, ville ou espèce" value={vm.filters.q} onChange={(e) => vm.setFilter('q', e.target.value)} />
        </div>
        <Select wrapperClassName="min-w-[150px] flex-1" label="Gravité" value={vm.filters.gravite} onChange={(e) => vm.setFilter('gravite', e.target.value as '' | 'elevee' | 'moyenne' | 'faible')}>
          <option value="">Toutes</option>{GRAVITES.map((g) => <option key={g} value={g}>{GRAVITE_LABEL[g]}</option>)}
        </Select>
        <Button variant="secondary" onClick={vm.resetFilters} disabled={!filtered}>Réinitialiser</Button>
      </div>

      <section className="overflow-hidden rounded-lg2 border border-line bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-line px-5 py-[15px]"><h3 className="text-[15px] font-bold">Foyers signalés</h3><span className="text-xs text-slate" aria-live="polite">{vm.foyers.length} foyer{vm.foyers.length > 1 ? 's' : ''}</span></header>
        {vm.loading ? <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          : vm.foyers.length === 0 ? <EmptyState title="Aucun foyer signalé" description={filtered ? 'Aucun foyer ne correspond à vos critères.' : "Aucun foyer n'a été signalé au réseau."} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>{['Maladie', 'Espèce', 'Localité', 'Cas', 'Gravité', 'Statut', 'Déclaré par', 'Actions'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {vm.foyers.map((e) => (
                    <tr key={e.id} onClick={() => vm.open(e.id)} className="cursor-pointer border-b border-[#eef2f5] hover:bg-mist">
                      <td className="px-4 py-3 font-semibold">{e.maladie}</td>
                      <td className="px-4 py-3">{e.espece}</td>
                      <td className="px-4 py-3">{e.ville}</td>
                      <td className="px-4 py-3 tabular-nums">{e.cas}</td>
                      <td className="px-4 py-3"><Badge tone={GRAVITE_TONE[e.gravite]}>{GRAVITE_LABEL[e.gravite]}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={EPI_STATUT_TONE[e.statut]}>{EPI_STATUT_LABEL[e.statut]}</Badge></td>
                      <td className="px-4 py-3">{e.declarant.nom}</td>
                      <td className="whitespace-nowrap px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <Button variant="info" size="icon" aria-label={`Détail du foyer ${e.maladie}`} title="Détail" onClick={() => vm.open(e.id)}><Eye size={14} /></Button>
                          {e.peut_resoudre && <Button variant="success" size="icon" aria-label={`Marquer résolu le foyer ${e.maladie}`} title="Marquer résolu" onClick={() => vm.resolve(e.id)}><Check size={14} /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <EpiComposer open={vm.composing} especes={vm.especes} busy={vm.reporting} onClose={vm.closeComposer} onSubmit={vm.report} />
      <EpiDetail foyer={vm.selected} resolving={vm.resolving} onClose={vm.closeDetail} onResolve={vm.resolve} />
    </div>
  );
}

function EpiComposer({ open, especes, busy, onClose, onSubmit }: { open: boolean; especes: string[]; busy: boolean; onClose: () => void; onSubmit: (f: EpiForm) => Promise<unknown> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EpiForm>({ resolver: zodResolver(epiFormSchema), defaultValues: emptyEpiForm() });
  useEffect(() => { if (open) reset(emptyEpiForm(especes[0] ?? '')); }, [open, especes]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = handleSubmit(async (f) => { await onSubmit(f); });
  return (
    <Modal open={open} onClose={onClose} title="Signaler un foyer épidémique" footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={busy} onClick={submit}>Signaler au réseau</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Maladie ou pathologie *" placeholder="Ex. Maladie de Newcastle" error={errors.maladie?.message} {...register('maladie')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Espèce *" error={errors.espece?.message} {...register('espece')}>{especes.map((e) => <option key={e} value={e}>{e}</option>)}</Select>
          <Input label="Nombre de cas *" type="number" min={1} error={errors.cas?.message} {...register('cas')} />
          <Input label="Localité *" placeholder="Ex. Thiès" error={errors.ville?.message} {...register('ville')} />
          <Select label="Gravité" {...register('gravite')}>{GRAVITES.map((g) => <option key={g} value={g}>{GRAVITE_LABEL[g]}</option>)}</Select>
        </div>
        <Textarea label="Notes et observations" rows={3} placeholder="Symptômes, mesures prises" {...register('notes')} />
        <p className="text-xs text-faint">Si plusieurs établissements signalent la même maladie dans la même zone, une alerte réseau se déclenche.</p>
      </form>
    </Modal>
  );
}

function EpiDetail({ foyer, resolving, onClose, onResolve }: { foyer: Epidemie | null; resolving: boolean; onClose: () => void; onResolve: (id: string) => void }) {
  const rows = foyer ? [
    ['Maladie', foyer.maladie], ['Espèce', foyer.espece], ['Localité', foyer.ville], ['Cas signalés', String(foyer.cas)], ['Gravité', GRAVITE_LABEL[foyer.gravite]], ['Statut', EPI_STATUT_LABEL[foyer.statut]],
    ['Déclaré par', `${foyer.declarant.nom}, ${foyer.clinique}, le ${formatDate(foyer.date)}`], ['Notes', foyer.notes || 'Aucune'],
  ] : [];
  return (
    <Modal open={!!foyer} onClose={onClose} title={foyer ? `Foyer : ${foyer.maladie}` : 'Foyer'}
      footer={foyer?.peut_resoudre ? <Button loading={resolving} onClick={() => onResolve(foyer.id)}><Check size={14} /> Marquer résolu</Button> : undefined}>
      <dl className="divide-y divide-line rounded-lg2 bg-mist px-4 py-1 text-[13px]">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-slate">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
      </dl>
    </Modal>
  );
}
