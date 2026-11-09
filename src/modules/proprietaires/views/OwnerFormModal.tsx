import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@/shared/ui';
import { Owner, OwnerForm, emptyOwnerForm, ownerFormSchema } from '../models/proprietaire';

interface Props { target: 'new' | Owner | null; saving: boolean; onSubmit: (f: OwnerForm) => void; onClose: () => void }

export function OwnerFormModal({ target, saving, onSubmit, onClose }: Props) {
  const editing = target && target !== 'new' ? target : null;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OwnerForm>({ resolver: zodResolver(ownerFormSchema), defaultValues: emptyOwnerForm });

  useEffect(() => {
    if (!target) return;
    reset(editing ? { prenom: editing.prenom, nom: editing.nom, telephone: editing.telephone, email: editing.email, adresse: editing.adresse } : emptyOwnerForm);
  }, [target, editing, reset]);

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={editing ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={saving} onClick={handleSubmit(onSubmit)}>{editing ? 'Enregistrer' : 'Ajouter'}</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Prénom *" autoFocus error={errors.prenom?.message} {...register('prenom')} />
        <Input label="Nom *" error={errors.nom?.message} {...register('nom')} />
        <Input label="Téléphone" placeholder="77 123 45 67" error={errors.telephone?.message} {...register('telephone')} />
        <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
        <Input wrapperClassName="sm:col-span-2" label="Adresse" {...register('adresse')} />
      </form>
    </Modal>
  );
}
