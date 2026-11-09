import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Contact, Mail, MapPin, Phone, Search, Send } from 'lucide-react';
import { Button, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '@/shared/ui';
import { Confrere, OrientationForm, initials, orientationFormSchema, telHref } from '../models/reseau';
import { useAnnuaireViewModel } from '../viewmodels/useAnnuaireViewModel';

const linkBtn = 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-[11px] py-[5px] text-xs font-semibold hover:bg-mist';

/** Annuaire du réseau : trouver un confrère par ville, spécialité ou équipement, et lui orienter un patient. */
export function AnnuairePage() {
  const vm = useAnnuaireViewModel();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 rounded-lg2 border border-line bg-gradient-to-r from-violet-pale to-white px-5 py-[18px]">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-violet text-white"><Contact size={24} /></span>
        <div>
          <h3 className="font-serif text-[17px] font-bold text-deep">Annuaire du réseau</h3>
          <p className="max-w-[640px] text-[13px] text-slate">Trouvez un confrère par ville, spécialité ou équipement. Orientez un patient vers une clinique mieux équipée.</p>
        </div>
      </div>

      <div className="relative rounded-lg2 border border-line bg-white px-4 py-3">
        <Search size={15} className="pointer-events-none absolute left-7 top-[46px] text-faint" />
        <Input label="Recherche" className="pl-9" placeholder="Nom, établissement, ville, spécialité ou équipement" value={vm.q} onChange={(e) => vm.setQ(e.target.value)} />
      </div>

      {vm.loading ? <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52" />)}</div>
        : vm.confreres.length === 0 ? <div className="rounded-lg2 border border-line bg-white"><EmptyState title="Aucun confrère trouvé" description="Essayez une autre ville, spécialité ou équipement." /></div>
        : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {vm.confreres.map((a) => (
              <article key={a.id} className="flex flex-col gap-3 rounded-lg2 border border-line bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8472e0] to-violet text-sm font-bold text-white">{initials(a.nom)}</span>
                  <div className="min-w-0"><h4 className="truncate text-[14.5px] font-bold">{a.nom}</h4><p className="truncate text-xs text-slate">{a.clinique}</p></div>
                </div>
                <p className="inline-flex items-center gap-1 text-xs text-slate"><MapPin size={12} /> {a.ville}</p>
                <Chips label="Spécialités" items={a.specialites} className="bg-brand-pale text-brand-text" />
                <Chips label="Équipements" items={a.equipements} className="bg-slate-soft text-slate-text" />
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <a href={telHref(a.telephone)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-light to-brand px-[11px] py-[5px] text-xs font-semibold text-white"><Phone size={12} /> Appeler</a>
                  <a href={`mailto:${a.email}`} className={linkBtn}><Mail size={12} /> Écrire</a>
                  {vm.canOrient && <button type="button" onClick={() => vm.openOrient(a)} className={linkBtn}><Send size={12} /> Orienter un patient</button>}
                </div>
              </article>
            ))}
          </div>
        )}

      <OrientationDialog confrere={vm.target} patients={vm.patients} loading={vm.patientsLoading} busy={vm.sending} onClose={vm.closeOrient} onSubmit={vm.send} />
    </div>
  );
}

function Chips({ label, items, className }: { label: string; items: string[]; className: string }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[1px] text-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">{items.map((i) => <span key={i} className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${className}`}>{i}</span>)}</div>
    </div>
  );
}

interface DialogProps { confrere: Confrere | null; patients: { id: string; nom: string; matricule: string; espece: { nom: string } }[]; loading: boolean; busy: boolean; onClose: () => void; onSubmit: (f: OrientationForm) => Promise<unknown> }

function OrientationDialog({ confrere, patients, loading, busy, onClose, onSubmit }: DialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrientationForm>({ resolver: zodResolver(orientationFormSchema), defaultValues: { patient_id: '', motif: '' } });
  useEffect(() => { reset({ patient_id: '', motif: '' }); }, [confrere?.id, reset]);
  const submit = handleSubmit(async (f) => { await onSubmit(f); });
  return (
    <Modal open={!!confrere} onClose={onClose} title="Orienter un patient" footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={busy} onClick={submit}><Send size={14} /> Transmettre le dossier</Button></>}>
      {confrere && (
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="text-[13px] text-slate">Orienter un patient vers <b>{confrere.nom}</b>, {confrere.clinique}, {confrere.ville}.</p>
          <Select label="Patient à orienter *" disabled={loading} error={errors.patient_id?.message} {...register('patient_id')}>
            <option value="">{loading ? 'Chargement' : 'Choisir un patient'}</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.nom}, {p.espece.nom} ({p.matricule})</option>)}
          </Select>
          <Textarea label="Motif de l'orientation *" rows={3} placeholder="Ex. Nécessite un plateau chirurgical ou un examen spécialisé" error={errors.motif?.message} {...register('motif')} />
          <p className="text-xs text-faint">Le confrère recevra le dossier du patient et vos coordonnées.</p>
        </form>
      )}
    </Modal>
  );
}
