import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { ENTITES, SurMesureForm, emptySurMesure, surMesureSchema } from '../models/association';
import { associationService } from '../services/association.service';
import { ModulePicker } from './ModulePicker';

/** Offre sur mesure : l'association crée le pack personnalisé et l'entité du visiteur après accord ; ses identifiants partent comme pour une inscription. */
export function SurMesureModal({ open, onClose, onSubmit, pending }: { open: boolean; onClose: () => void; onSubmit: (f: SurMesureForm) => void; pending: boolean }) {
  const offres = useQuery({ queryKey: ['asso', 'modules-catalogue'], queryFn: associationService.modulesCatalogue, enabled: open });
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<SurMesureForm>({ resolver: zodResolver(surMesureSchema), defaultValues: emptySurMesure() });
  useEffect(() => { if (open) reset(emptySurMesure()); }, [open, reset]);
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Offre sur mesure"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={pending} onClick={handleSubmit(onSubmit)}>Créer l'entité et envoyer les identifiants</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Type d'entité *" error={errors.entite?.message} {...register('entite')}>{ENTITES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}</Select>
        <Input label="Nom de l'entité *" error={errors.nom?.message} {...register('nom')} />
        <Input label="Numéro d'ordre" placeholder="ODVS-0000" error={errors.ordre?.message} {...register('ordre')} />
        <Input label="Téléphone *" error={errors.telephone?.message} {...register('telephone')} />
        <Input label="Adresse" {...register('adresse')} />
        <Input label="Ville" {...register('ville')} />
        <Input label="Responsable *" placeholder="Prénom et nom" error={errors.responsable?.message} {...register('responsable')} />
        <Input label="E-mail *" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Nom d'utilisateur de l'administrateur *" error={errors.identifiant?.message} {...register('identifiant')} />
        <Input label="Tarif mensuel (FCFA) *" inputMode="numeric" error={errors.tarif?.message} {...register('tarif')} />
        <Input label="Utilisateurs maximum" inputMode="numeric" hint="Vide : illimité." error={errors.utilisateursMax?.message} {...register('utilisateursMax')} />
        <Input label="Nombre de vétérinaires" inputMode="numeric" error={errors.veterinaires?.message} {...register('veterinaires')} />
        <Select label="Périodicité" {...register('periode')}><option value="mensuel">Mensuel</option><option value="annuel">Annuel</option></Select>
        <label className="flex items-center gap-2 self-end pb-2 text-[13px] font-medium"><input type="checkbox" className="accent-brand" {...register('essai')} /> Démarrer par un essai gratuit</label>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Modules à activer *</p>
          <Controller control={control} name="modules" render={({ field }) => <ModulePicker modules={offres.data?.modules ?? []} alwaysOn={offres.data?.toujours_actifs ?? []} value={field.value} onChange={field.onChange} />} />
          {errors.modules && <p className="mt-1 text-xs text-danger">{errors.modules.message}</p>}
        </div>
      </form>
    </Modal>
  );
}
