import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unprocessableMessage } from '@/core/http/errors';
import { Button, Input, Modal, Select, toast } from '@/shared/ui';
import { useSpeciesChoices } from '@/modules/referentiels/viewmodels/useSpeciesChoices';
import { CampagneForm, VACCINS, campagneFormSchema, emptyCampagne } from '../models/vaccination';
import { vaccinationService } from '../services/vaccination.service';

export function CampagneFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const species = useSpeciesChoices();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampagneForm>({ resolver: zodResolver(campagneFormSchema), defaultValues: emptyCampagne() });
  useEffect(() => { if (open) reset(emptyCampagne()); }, [open, reset]);
  const save = useMutation({
    mutationFn: vaccinationService.createCampagne,
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
    onSuccess: () => { toast.success('Campagne programmée'); void queryClient.invalidateQueries({ queryKey: ['campagnes'] }); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} title="Programmer une campagne"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Programmer</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input wrapperClassName="sm:col-span-2" label="Nom de la campagne *" placeholder="Campagne antirabique" error={errors.nom?.message} {...register('nom')} />
        <Select label="Espèce cible *" error={errors.especeId?.message} {...register('especeId')}>
          <option value="">Choisir…</option>{(species.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </Select>
        <Select label="Vaccin" {...register('vaccin')}><option value="">Non précisé</option>{VACCINS.map((v) => <option key={v}>{v}</option>)}</Select>
        <Input label="Zone / secteur *" placeholder="Ziguinchor" error={errors.zone?.message} {...register('zone')} />
        <Input label="Date de début" type="date" {...register('date')} />
        <Input label="Nombre d'animaux visés" inputMode="numeric" hint="Sans objectif, la progression reste à 0 %." error={errors.vises?.message} {...register('vises')} />
      </form>
    </Modal>
  );
}
