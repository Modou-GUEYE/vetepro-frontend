import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { toApiError, unprocessableMessage } from '@/core/http/errors';
import { Button, ConfirmDialog, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { NewPatientFields } from '@/modules/patients/views/NewPatientFields';
import { useVeterinaireChoices } from '@/modules/rendez-vous/viewmodels/useVeterinaireChoices';
import { useServiceChoices } from '@/modules/consultations/viewmodels/useServiceChoices';
import { modeLabel } from '@/modules/facturation/models/facture';
import { Acte, InsemForm, METHODES, METHODE_LABEL, MODES_INDICATIFS, emptyInsem, insemFormSchema, insemFromActe, tarifLocked } from '../models/insemination';
import { Confirmations, inseminationService } from '../services/insemination.service';

interface Props { open: boolean; editing?: Acte; onClose: () => void }

const Section = ({ children }: { children: React.ReactNode }) => (
  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">{children}<span className="h-px flex-1 bg-line" /></h4>
);

/** Ajout ou modification d'un acte d'insémination (patient existant ou nouveau, géniteur et semence, facturation). */
export function InsemFormModal({ open, editing, onClose }: Props) {
  const queryClient = useQueryClient();
  const patients = usePatientChoices();
  const vets = useVeterinaireChoices();
  const services = useServiceChoices();
  const defaultTarif = String((services.data ?? []).find((s) => /ins[ée]mination/i.test(s.libelle))?.prix ?? 0);
  const methods = useForm<InsemForm>({ resolver: zodResolver(insemFormSchema), defaultValues: emptyInsem() });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = methods;
  const [pending, setPending] = useState<{ kind: 'duplicate' | 'reset_confirm'; message: string } | null>(null);
  useEffect(() => { if (open) { reset(editing ? insemFromActe(editing) : emptyInsem({ tarif: defaultTarif })); setPending(null); } }, [open, editing, defaultTarif, reset]);
  const v = watch();
  const patient = (patients.data ?? []).find((p) => p.id === v.patientId);
  const male = v.mode === 'existant' && patient?.type === 'animal' && patient.sexe === 'M';
  const hasResult = !!editing && editing.resultat !== 'attente';
  const locked = tarifLocked(editing);

  const save = useMutation({
    mutationFn: ({ f, c }: { f: InsemForm; c: Confirmations }) => (editing ? inseminationService.update(editing.id, f, c) : inseminationService.create(f, c)),
    onSuccess: (a) => {
      toast.success(editing ? 'Acte modifié' : `Acte d'insémination enregistré (${a.numero})`);
      for (const k of ['inseminations', 'gestations', 'invoices', 'patients', 'patient-choices', 'owner-choices']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
    onError: (e) => { const a = toApiError(e); if (a.code === 'duplicate' || a.code === 'reset_confirm') setPending({ kind: a.code, message: a.message }); else { const m = unprocessableMessage(e); if (m) toast.error(m); } },
  });
  const submit = handleSubmit((f) => save.mutate({ f, c: {} }));
  const confirm = handleSubmit((f) => { const kind = pending?.kind; setPending(null); save.mutate({ f, c: kind === 'duplicate' ? { doublon: true } : { reinitialisation: true } }); });

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg" title={editing ? `Modifier l'acte ${editing.numero}` : "Nouvel acte d'insémination"}
        footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={submit}>{editing ? 'Enregistrer' : "Enregistrer l'acte"}</Button></>}>
        <FormProvider {...methods}>
          <form onSubmit={submit} noValidate className="space-y-6">
            <div>
              <Section>Femelle ou troupeau</Section>
              {!editing && (
                <div role="tablist" aria-label="Patient" className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-line text-[13px] font-semibold">
                  {(['existant', 'nouveau'] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={v.mode === m} onClick={() => setValue('mode', m)}
                      className={clsx('px-4 py-2.5 transition', v.mode === m ? 'bg-brand text-white' : 'bg-mist text-slate hover:bg-white')}>{m === 'existant' ? 'Patient existant' : 'Nouveau patient'}</button>
                  ))}
                </div>
              )}
              {v.mode === 'existant' ? (
                <Select label="Patient (animal ou troupeau) *" error={errors.patientId?.message} {...register('patientId')}>
                  <option value="">Choisir…</option>{(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              ) : <NewPatientFields />}
              {male && <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-pale px-3 py-2 text-[13px] text-amber-text"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> L'animal sélectionné est un mâle : vérifiez le patient avant d'enregistrer.</p>}
            </div>

            <div>
              <Section>Acte</Section>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Date de l'acte *" type="date" error={errors.date?.message} {...register('date')} />
                <Select label="Méthode *" error={errors.methode?.message} {...register('methode')}>{METHODES.map((m) => <option key={m} value={m}>{METHODE_LABEL[m]}</option>)}</Select>
                <Select label="Technicien ou vétérinaire" {...register('vetId')}><option value="">Non précisé</option>{(vets.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</Select>
                <Select label="Statut *" hint={hasResult ? 'Un résultat de diagnostic impose le statut Réalisé.' : undefined} {...register('statut')}>
                  <option value="planifie" disabled={hasResult}>Planifié</option><option value="realise">Réalisé</option>
                </Select>
                <Textarea wrapperClassName="sm:col-span-2" label="Observations sur l'acte" placeholder="Conditions, protocole de synchronisation, remarques…" {...register('observations')} />
              </div>
            </div>

            <div>
              <Section>Géniteur et semence</Section>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Race ou génotype du géniteur" placeholder="Zébu Gobra, Frison…" {...register('raceGeniteur')} />
                <Input label="Nom ou numéro du géniteur" placeholder="Toro-221" error={errors.nomGeniteur?.message} {...register('nomGeniteur')} />
                {v.methode !== 'naturelle' && (
                  <>
                    <Input label="N° de lot de semence" placeholder="LOT-2026-001" {...register('lot')} />
                    <Input label="Dose ou paillette" placeholder="1 paillette, 0,5 mL" {...register('dose')} />
                    <Input label="Origine de la semence" placeholder="ANEV, CIRAD…" {...register('origine')} />
                    <Input label="Date de collecte ou congélation" type="date" {...register('dateCollecte')} />
                  </>
                )}
              </div>
            </div>

            <div>
              <Section>Facturation</Section>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Tarif de l'acte (FCFA)" inputMode="numeric" disabled={locked}
                  hint={locked ? 'La facture a déjà reçu un paiement : le tarif ne peut plus changer.' : "Pré-rempli avec le service « Insémination », modifiable. 0 : acte non facturé."} error={errors.tarif?.message} {...register('tarif')} />
                <Select label="Mode de paiement" hint="Indicatif : seul un paiement enregistré met la facture à jour." {...register('modePaiement')}>
                  <option value="">Non précisé</option>{MODES_INDICATIFS.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}
                </Select>
              </div>
            </div>
          </form>
        </FormProvider>
      </Modal>
      <ConfirmDialog open={!!pending} title={pending?.kind === 'duplicate' ? 'Doublon possible' : 'Remettre le résultat à « En attente » ?'} message={pending?.message ?? ''}
        confirmLabel={pending?.kind === 'duplicate' ? 'Enregistrer quand même' : 'Confirmer'} loading={save.isPending} onConfirm={confirm} onCancel={() => setPending(null)} />
    </>
  );
}
