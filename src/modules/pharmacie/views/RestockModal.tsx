import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { RestockForm, restockFormSchema } from '../models/pharmacie';
import { useArticleChoices } from '../viewmodels/useArticleChoices';

export function RestockModal({ target, saving, onSubmit, onClose }: { target: { articleId: string } | null; saving: boolean; onSubmit: (f: RestockForm) => void; onClose: () => void }) {
  const choices = useArticleChoices();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RestockForm>({ resolver: zodResolver(restockFormSchema), defaultValues: { articleId: '', quantite: '' } });
  useEffect(() => { if (target) reset({ articleId: target.articleId, quantite: '' }); }, [target, reset]);
  return (
    <Modal open={!!target} onClose={onClose} title="Réapprovisionner"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={saving} onClick={handleSubmit(onSubmit)}>Ajouter au stock</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select wrapperClassName="sm:col-span-2" label="Médicament *" error={errors.articleId?.message} {...register('articleId')}>
          <option value="">Choisir…</option>
          {(choices.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.nom} ({a.quantite} en stock)</option>)}
        </Select>
        <Input label="Quantité à ajouter *" inputMode="numeric" autoFocus error={errors.quantite?.message} {...register('quantite')} />
        <p className="self-end pb-2 text-xs text-slate">Le mouvement d'entrée est tracé avec votre nom et la date.</p>
      </form>
    </Modal>
  );
}
