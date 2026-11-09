import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, Select, Textarea } from '@/shared/ui';
import { Service, ServiceForm, emptyServiceForm, serviceFormSchema } from '../models/referentiels';

interface Props { target: 'new' | Service | null; categories: string[]; saving: boolean; onSubmit: (f: ServiceForm) => void; onClose: () => void }

export function ServiceFormModal({ target, categories, saving, onSubmit, onClose }: Props) {
  const editing = target && target !== 'new' ? target : null;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceForm>({ resolver: zodResolver(serviceFormSchema), defaultValues: emptyServiceForm });

  useEffect(() => {
    if (!target) return;
    reset(editing ? { libelle: editing.libelle, categorie: editing.categorie, prix: String(editing.prix), description: editing.description } : emptyServiceForm);
  }, [target, editing, reset]);

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={editing ? 'Modifier le service' : 'Nouveau service'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={saving} onClick={handleSubmit(onSubmit)}>{editing ? 'Enregistrer' : 'Créer le service'}</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input wrapperClassName="sm:col-span-2" label="Libellé *" error={errors.libelle?.message} {...register('libelle')} />
        <Select label="Catégorie *" disabled={!!editing} hint={editing ? 'La catégorie ne change pas après la création.' : undefined} error={errors.categorie?.message} {...register('categorie')}>
          <option value="">Choisir…</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Prix (FCFA) *" inputMode="numeric" error={errors.prix?.message} {...register('prix')} />
        <Textarea wrapperClassName="sm:col-span-2" label="Description" {...register('description')} />
        <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate sm:col-span-2">Lors d'une consultation, ce prix s'affiche sur la facture et reste modifiable.</p>
      </form>
    </Modal>
  );
}
