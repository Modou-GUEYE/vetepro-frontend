import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unprocessableMessage } from '@/core/http/errors';
import { Button, Modal, Textarea, toast } from '@/shared/ui';
import { Acte, DeleteForm, deleteFormSchema } from '../models/insemination';
import { inseminationService } from '../services/insemination.service';

/** Suppression logique réservée à l'Administrateur, avec motif obligatoire ; refusée si la facture a reçu un paiement. */
export function DeleteInsemModal({ acte, onClose }: { acte: Acte; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeleteForm>({ resolver: zodResolver(deleteFormSchema), defaultValues: { motif: '' } });
  useEffect(() => reset({ motif: '' }), [acte, reset]);
  const del = useMutation({
    mutationFn: (f: DeleteForm) => inseminationService.remove(acte.id, f),
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
    onSuccess: () => {
      toast.success('Acte supprimé');
      for (const k of ['inseminations', 'gestations', 'invoices']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
  });
  return (
    <Modal open onClose={onClose} title={`Supprimer l'acte ${acte.numero}`}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button variant="danger" loading={del.isPending} onClick={handleSubmit((f) => del.mutate(f))}>Supprimer</Button></>}>
      <form onSubmit={handleSubmit((f) => del.mutate(f))} noValidate className="space-y-3">
        <p className="text-[13px] text-slate">L'acte disparaît de la liste, son historique est conservé. Si sa facture n'a reçu aucun paiement, elle est annulée.</p>
        <Textarea label="Motif de suppression *" autoFocus error={errors.motif?.message} {...register('motif')} />
      </form>
    </Modal>
  );
}
