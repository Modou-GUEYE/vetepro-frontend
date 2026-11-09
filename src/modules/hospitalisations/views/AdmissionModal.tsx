import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { NewPatientFields } from '@/modules/patients/views/NewPatientFields';
import { useVeterinaireChoices } from '@/modules/rendez-vous/viewmodels/useVeterinaireChoices';
import { AdmissionForm, HospiDetail, admissionFormSchema, admissionFromDetail, emptyAdmission } from '../models/hospi';
import { hospiService } from '../services/hospi.service';

interface Props { open: boolean; editing?: HospiDetail; onClose: () => void; onSaved: (id: string) => void }

/** Admission (patient existant ou animal inconnu) ou modification d'une hospitalisation en cours. */
export function AdmissionModal({ open, editing, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const patients = usePatientChoices();
  const vets = useVeterinaireChoices();
  const methods = useForm<AdmissionForm>({ resolver: zodResolver(admissionFormSchema), defaultValues: emptyAdmission() });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = methods;
  useEffect(() => { if (open) reset(editing ? admissionFromDetail(editing) : emptyAdmission()); }, [open, editing, reset]);
  const v = watch();

  const save = useMutation({
    mutationFn: (f: AdmissionForm) => (editing ? hospiService.update(editing.id, f) : hospiService.admit(f)),
    onSuccess: (h) => {
      toast.success(editing ? 'Hospitalisation modifiée' : `Patient admis (${h.numero})`);
      for (const k of ['hospis', 'hospi', 'patient-choices', 'patients', 'owner-choices']) void queryClient.invalidateQueries({ queryKey: [k] });
      onSaved(h.id);
    },
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? `Modifier ${editing.numero}` : 'Nouvelle admission'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>{editing ? 'Enregistrer' : 'Admettre le patient'}</Button></>}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="space-y-5">
          {!editing && (
            <div role="tablist" aria-label="Patient" className="grid grid-cols-2 overflow-hidden rounded-lg border border-line text-[13px] font-semibold">
              {(['existant', 'nouveau'] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={v.mode === m} onClick={() => setValue('mode', m)}
                  className={clsx('px-4 py-2.5 transition', v.mode === m ? 'bg-brand text-white' : 'bg-mist text-slate hover:bg-white')}>
                  {m === 'existant' ? 'Patient existant' : 'Nouveau patient'}
                </button>
              ))}
            </div>
          )}
          {editing ? (
            <p className="rounded-lg bg-mist px-3 py-2 text-[13px]">Patient : <b>{editing.patient?.nom}</b> ({editing.patient?.espece}), {editing.proprietaire?.nom}</p>
          ) : v.mode === 'existant' ? (
            <Select label="Patient *" hint="Un patient déjà hospitalisé ne peut pas être admis une seconde fois." error={errors.patientId?.message} {...register('patientId')}>
              <option value="">Choisir…</option>{(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          ) : <NewPatientFields />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Vétérinaire responsable" {...register('vetId')}>
              <option value="">Non précisé</option>{(vets.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </Select>
            <Input label="Box ou cage *" placeholder="Cage A-3, Box 2…" error={errors.box?.message} {...register('box')} />
            <Input label="Date d'entrée *" type="date" max={new Date().toISOString().slice(0, 10)} error={errors.dateEntree?.message} {...register('dateEntree')} />
            <Input label="Sortie prévue" type="date" error={errors.dateSortiePrevue?.message} {...register('dateSortiePrevue')} />
            <Input label="Tarif d'hébergement par jour (FCFA) *" inputMode="numeric" error={errors.tarifJour?.message} {...register('tarifJour')} />
            <Input label="Consultation initiale (FCFA)" inputMode="numeric" hint="0 si elle n'est pas facturée." error={errors.tarifConsultation?.message} {...register('tarifConsultation')} />
            <Input wrapperClassName="sm:col-span-2" label="Motif d'hospitalisation *" placeholder="Post-opératoire, perfusion, surveillance…" error={errors.motif?.message} {...register('motif')} />
            <Textarea wrapperClassName="sm:col-span-2" label="Observations à l'entrée" placeholder="État clinique, traitements en cours, remarques…" {...register('observations')} />
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
