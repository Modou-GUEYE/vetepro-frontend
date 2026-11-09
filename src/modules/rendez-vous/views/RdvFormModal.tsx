import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { CANAL_LABEL, CANAUX } from '@/modules/notifications/models/notification';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { NewPatientFields } from '@/modules/patients/views/NewPatientFields';
import { DURATIONS, DURATION_LABEL, MOTIFS, RdvForm, RdvRow, emptyRdvForm, formFromRdv, rdvFormSchema } from '../models/rdv';
import { rdvService } from '../services/rdv.service';
import { useSlots } from '../viewmodels/useSlots';
import { useVeterinaireChoices } from '../viewmodels/useVeterinaireChoices';

interface Props { open: boolean; editing?: RdvRow | null; date?: string; onClose: () => void; onSaved: (id: string) => void }

export function RdvFormModal({ open, editing, date, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const patients = usePatientChoices();
  const vets = useVeterinaireChoices();
  const methods = useForm<RdvForm>({ resolver: zodResolver(rdvFormSchema), defaultValues: emptyRdvForm() });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = methods;
  useEffect(() => {
    if (open) reset(editing ? formFromRdv(editing) : emptyRdvForm({ date: date ?? '', vetId: vets.data?.length === 1 ? vets.data[0]!.id : '' }));
  }, [open, editing, date, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = watch();
  const slots = useSlots(v.vetId, v.date, Number(v.duree), editing?.id, open);
  // Un créneau choisi qui n'est plus libre (autre vétérinaire, autre durée) est retiré pour obliger à en choisir un valide.
  const free = slots.data ?? [];
  const options = editing && v.vetId === editing.veterinaire.id && v.date === editing.date && v.heure === editing.heure && !free.includes(v.heure) ? [v.heure, ...free] : free;
  useEffect(() => { if (slots.data && v.heure && !options.includes(v.heure)) setValue('heure', ''); }, [slots.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (f: RdvForm) => (editing ? rdvService.update(editing.id, f) : rdvService.create(f)),
    onSuccess: (r) => {
      const failed = r.envoi?.statut === 'echec';
      toast[failed ? 'warning' : 'success'](failed ? `Rendez-vous enregistré, message non envoyé : ${r.envoi!.erreur}` : editing ? 'Rendez-vous modifié, le propriétaire est prévenu' : 'Rendez-vous créé, le propriétaire est prévenu');
      for (const k of ['rdv', 'rdv-slots', 'patient-choices', 'patients', 'owner-choices']) void queryClient.invalidateQueries({ queryKey: [k] });
      onSaved(r.id);
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>{editing ? 'Enregistrer' : 'Créer le rendez-vous'}</Button></>}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="space-y-5">
          {!editing && (
            <div role="tablist" aria-label="Patient" className="grid grid-cols-2 overflow-hidden rounded-lg border border-line text-[13px] font-semibold">
              {(['existant', 'nouveau'] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={v.mode === m} onClick={() => setValue('mode', m)}
                  className={clsx('px-4 py-2.5 transition', v.mode === m ? 'bg-brand text-white' : 'bg-mist text-slate hover:bg-white')}>
                  {m === 'existant' ? 'Patient existant' : 'Nouvel animal'}
                </button>
              ))}
            </div>
          )}
          {v.mode === 'existant' ? (
            <Select label="Patient *" disabled={!!editing} error={errors.patientId?.message} {...register('patientId')}>
              <option value="">Choisir…</option>{(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          ) : <NewPatientFields />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Vétérinaire *" error={errors.vetId?.message} {...register('vetId')}>
              <option value="">Choisir…</option>{(vets.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}{x.specialite ? `, ${x.specialite}` : ''}</option>)}
            </Select>
            <Input label="Date *" type="date" min={today} error={errors.date?.message} {...register('date')} />
            <Select label="Durée" {...register('duree')}>{DURATIONS.map((d) => <option key={d} value={d}>{DURATION_LABEL(d)}</option>)}</Select>
            <div>
              <Select label="Heure *" disabled={!v.vetId || !v.date} error={errors.heure?.message} {...register('heure')}>
                <option value="">{!v.vetId || !v.date ? "Choisir d'abord le vétérinaire et la date" : slots.isLoading ? 'Recherche des créneaux…' : options.length ? 'Choisir un créneau…' : 'Aucun créneau libre'}</option>
                {options.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
              {v.vetId && v.date && slots.data && options.length === 0 && <p role="alert" className="mt-1 text-xs text-danger">Créneau indisponible : choisissez un autre jour, une durée plus courte ou un autre vétérinaire.</p>}
            </div>
            <div className="sm:col-span-2">
              <Input label="Motif de consultation" list="rdv-motifs" placeholder="Vaccination, contrôle…" {...register('motif')} />
              <datalist id="rdv-motifs">{MOTIFS.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
            <Select label="Prévenir le propriétaire par" {...register('canal')}>{CANAUX.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}</Select>
            <Textarea wrapperClassName="sm:col-span-2" label="Notes" placeholder="Informations complémentaires…" {...register('notes')} />
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
