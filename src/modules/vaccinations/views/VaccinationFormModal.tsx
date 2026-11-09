import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unprocessableMessage } from '@/core/http/errors';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { VACCINS, VaccinationForm, emptyVaccination, vaccinationFormSchema } from '../models/vaccination';
import { vaccinationService } from '../services/vaccination.service';

interface Props { open: boolean; patientId?: string; onClose: () => void }

/** Ajout d'une vaccination, depuis le registre ou depuis l'onglet Vaccins d'un dossier (animal présélectionné). */
export function VaccinationFormModal({ open, patientId, onClose }: Props) {
  const queryClient = useQueryClient();
  const patients = usePatientChoices();
  const animals = (patients.data ?? []).filter((p) => p.type === 'animal');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VaccinationForm>({ resolver: zodResolver(vaccinationFormSchema), defaultValues: emptyVaccination() });
  useEffect(() => { if (open) reset(emptyVaccination({ patientId: patientId ?? '' })); }, [open, patientId, reset]);

  const save = useMutation({
    mutationFn: vaccinationService.create,
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
    onSuccess: () => {
      toast.success('Vaccination enregistrée');
      for (const k of ['vaccinations', 'invoices', 'notifications']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Vaccination"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select wrapperClassName="sm:col-span-2" label="Animal *" error={errors.patientId?.message} disabled={!!patientId} {...register('patientId')}>
          <option value="">Choisir…</option>{animals.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Select label="Vaccin *" error={errors.vaccin?.message} {...register('vaccin')}>{VACCINS.map((v) => <option key={v}>{v}</option>)}</Select>
        <Input label="Date de la vaccination *" type="date" max={new Date().toISOString().slice(0, 10)} error={errors.date?.message} {...register('date')} />
        <Input label="Date de rappel" type="date" hint="Sans rappel, le statut reste vide et aucun SMS n'est envoyé." error={errors.rappel?.message} {...register('rappel')} />
        <Input label="Lot / fabricant" placeholder="N° de lot" {...register('lot')} />
        <Input label="Tarif (FCFA)" inputMode="numeric" hint="0 : vaccination non facturée, facturable plus tard." error={errors.tarif?.message} {...register('tarif')} />
        <Textarea wrapperClassName="sm:col-span-2" label="Notes / observations" placeholder="Réaction observée, remarques…" {...register('notes')} />
      </form>
    </Modal>
  );
}
