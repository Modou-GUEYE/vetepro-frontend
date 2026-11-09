import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { UserForm, UserRow, emptyUserForm, userFormSchema } from '../models/administration';
import { useProfilesQuery } from '../viewmodels/useProfilesQuery';

interface Props { target: 'new' | UserRow | null; saving: boolean; onSubmit: (f: UserForm) => void; onClose: () => void }

export function UserFormModal({ target, saving, onSubmit, onClose }: Props) {
  const profiles = useProfilesQuery();
  const editing = target && target !== 'new' ? target : null;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({ resolver: zodResolver(userFormSchema), defaultValues: emptyUserForm });

  useEffect(() => {
    if (!target) return;
    reset(editing
      ? { prenom: editing.prenom, nom: editing.nom, identifiant: editing.identifiant, email: editing.email, telephone: editing.telephone, specialite: editing.specialite, profilId: editing.profilId }
      : emptyUserForm);
  }, [target, editing, reset]);

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button loading={saving} onClick={handleSubmit(onSubmit)}>{editing ? 'Enregistrer' : 'Créer le compte'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Prénom *" error={errors.prenom?.message} {...register('prenom')} />
        <Input label="Nom *" error={errors.nom?.message} {...register('nom')} />
        <Input label="Identifiant de connexion *" autoComplete="off" error={errors.identifiant?.message} {...register('identifiant')} />
        <Select label="Profil *" error={errors.profilId?.message} {...register('profilId')}>
          <option value="">Choisir…</option>
          {(profiles.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Input label="E-mail *" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Téléphone" placeholder="77 123 45 67" error={errors.telephone?.message} {...register('telephone')} />
        <Input wrapperClassName="sm:col-span-2" label="Spécialité" placeholder="Ex : grands animaux" {...register('specialite')} />
        {!editing && (
          <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate sm:col-span-2">
            Le mot de passe est généré automatiquement et envoyé par e-mail à l'utilisateur.
          </p>
        )}
      </form>
    </Modal>
  );
}
