import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatFcfa } from '@/core/utils/format';
import { unprocessableMessage } from '@/core/http/errors';
import { Button, Input, Modal, toast } from '@/shared/ui';
import { BillForm, billFormSchema } from '../models/vaccination';
import { vaccinationService } from '../services/vaccination.service';

/** « Facturer » : saisie du tarif de la vaccination (strictement positif). Le paiement se suit dans la facturation. */
export function BillVaccinationModal({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BillForm>({ resolver: zodResolver(billFormSchema), defaultValues: { tarif: '' } });
  useEffect(() => reset({ tarif: '' }), [id, reset]);
  const save = useMutation({
    mutationFn: (f: BillForm) => vaccinationService.bill(id, f),
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
    onSuccess: (v) => {
      toast.success(`Vaccination facturée : ${formatFcfa(v.tarif)}`);
      for (const k of ['vaccinations', 'invoices']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
  });
  return (
    <Modal open onClose={onClose} title="Facturer la vaccination"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Facturer</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate>
        <Input label="Tarif de la vaccination (FCFA) *" inputMode="numeric" autoFocus error={errors.tarif?.message} {...register('tarif')} />
      </form>
    </Modal>
  );
}
