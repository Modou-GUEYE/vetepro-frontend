import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Play, Plus, Square, X } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, Input, Modal, Skeleton } from '@/shared/ui';
import { CAMPAGNE_LABEL, CAMPAGNE_TONE, TerrainForm, VACCINS, terrainFormSchema } from '../models/vaccination';
import { useCampagneViewModel } from '../viewmodels/useCampagneViewModel';
import { ProgressBar } from './ProgressBar';

/** Détail d'une campagne : synthèse, liste des animaux vaccinés et saisie terrain (responsive, utilisable sur mobile). */
export function CampagneDetailModal({ id, startInSaisie, onClose }: { id: string; startInSaisie?: boolean; onClose: () => void }) {
  const vm = useCampagneViewModel(id);
  const c = vm.campagne;
  const saisie = vm.saisie || !!startInSaisie;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TerrainForm>({ resolver: zodResolver(terrainFormSchema), defaultValues: { animal: '', proprietaire: '', vaccin: '' } });
  const submit = handleSubmit(async (f) => { await vm.addAnimal({ ...f, vaccin: f.vaccin || c?.vaccin || '' }); reset({ animal: '', proprietaire: '', vaccin: '' }); });

  return (
    <Modal open onClose={onClose} size="lg" title={c ? c.nom : 'Campagne'}
      footer={c && vm.canUpdate && (
        <>
          {c.statut === 'planifiee' && <Button variant="secondary" size="sm" loading={vm.statusBusy} onClick={() => vm.changeStatus('lancer')}><Play size={14} /> Lancer</Button>}
          {c.statut === 'encours' && <Button variant="secondary" size="sm" loading={vm.statusBusy} onClick={() => vm.changeStatus('cloturer')}><Square size={14} /> Clôturer</Button>}
          <Button size="sm" onClick={vm.toggleSaisie}><Plus size={14} /> {saisie ? 'Masquer la saisie' : 'Saisie terrain'}</Button>
        </>
      )}>
      {vm.loading || !c ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-32" /></div> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-[13px] text-slate">{c.espece.nom}, {c.zone}, {formatDate(c.date)}{c.vaccin && <>, vaccin : <b className="text-ink">{c.vaccin}</b></>}</p>
            <Badge tone={CAMPAGNE_TONE[c.statut]}>{CAMPAGNE_LABEL[c.statut]}</Badge>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">{c.vaccines} / {c.vises ?? '?'} vaccinés{c.vises ? ` (${c.progression} %)` : ''}</p>
            <ProgressBar value={c.progression} />
          </div>

          {saisie && vm.canUpdate && (
            <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3 rounded-lg border border-brand/30 bg-brand-pale/40 p-4 sm:grid-cols-4">
              <Input label="Animal *" placeholder="Nom ou identifiant" autoFocus error={errors.animal?.message} {...register('animal')} />
              <Input label="Propriétaire / éleveur" {...register('proprietaire')} />
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Vaccin
                <select defaultValue="" className="w-full rounded-lg border border-line bg-white px-[11px] py-2 text-[13px] font-normal normal-case tracking-normal text-ink" {...register('vaccin')}>
                  <option value="">{c.vaccin ? `${c.vaccin} (campagne)` : 'Non précisé'}</option>{VACCINS.map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
              <div className="flex items-end"><Button type="submit" loading={vm.adding} className="w-full">Enregistrer</Button></div>
            </form>
          )}

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>{['Animal', 'Propriétaire', 'Vaccin', 'Date', ''].map((h) => <th key={h} className="border-b border-line bg-[#f8fafb] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{h}</th>)}</tr></thead>
              <tbody>
                {c.animaux.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate">Aucun animal vacciné pour l'instant</td></tr>}
                {c.animaux.map((a) => (
                  <tr key={a.id} className="border-b border-[#eef2f5] last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{a.animal}</td><td className="px-4 py-2.5">{a.proprietaire || '—'}</td><td className="px-4 py-2.5">{a.vaccin || '—'}</td><td className="px-4 py-2.5">{formatDate(a.date)}</td>
                    <td className="px-4 py-2.5 text-right">{vm.canUpdate && <Button size="icon" variant="danger" aria-label={`Retirer ${a.animal}`} onClick={() => vm.removeAnimal(a.id)}><X size={13} /></Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
