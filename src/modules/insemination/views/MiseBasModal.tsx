import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unprocessableMessage } from '@/core/http/errors';
import { Button, Input, Modal, Textarea, toast } from '@/shared/ui';
import { Acte, MiseBasForm, emptyMiseBas, miseBasSchemaFor } from '../models/insemination';
import { inseminationService } from '../services/insemination.service';

/** Enregistrement de la mise-bas : la femelle sort du suivi des gestations. */
export function MiseBasModal({ acte, onClose }: { acte: Acte; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MiseBasForm>({ resolver: zodResolver(miseBasSchemaFor(acte.date)), defaultValues: emptyMiseBas() });
  useEffect(() => reset(emptyMiseBas()), [acte, reset]);
  const save = useMutation({
    mutationFn: (f: MiseBasForm) => inseminationService.miseBas(acte.id, f),
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
    onSuccess: () => {
      toast.success('Mise-bas enregistrée');
      for (const k of ['inseminations', 'gestations']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
  });
  const troupeau = acte.patient?.type === 'troupeau';
  return (
    <Modal open onClose={onClose} title={`Mise-bas, ${acte.patient?.nom ?? ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input wrapperClassName="sm:col-span-2" label="Date de mise-bas réelle *" type="date" min={acte.date} max={new Date().toISOString().slice(0, 10)} error={errors.date?.message} {...register('date')} />
        <Input label="Naissances vivantes" inputMode="numeric" error={errors.vivants?.message} {...register('vivants')} />
        <Input label="Naissances mortes" inputMode="numeric" error={errors.morts?.message} {...register('morts')} />
        <Textarea wrapperClassName="sm:col-span-2" label="Observations" placeholder="Difficultés, état de la mère…" {...register('observations')} />
        {troupeau && <p className="rounded-lg bg-mist px-3 py-2 text-[13px] sm:col-span-2">Pensez à mettre à jour l'effectif du troupeau (nouveau recensement) dans son dossier.</p>}
      </form>
    </Modal>
  );
}
