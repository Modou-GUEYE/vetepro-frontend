import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@/shared/ui';
import { PlatformPack, PlatformPromo, PromoForm, emptyPromo, promoFormSchema, promoToForm } from '../models/offres';

export function PromoFormModal({ promo, packs, onClose, onSubmit, pending }: { promo: PlatformPromo | 'new' | null; packs: PlatformPack[]; onClose: () => void; onSubmit: (f: PromoForm) => void; pending: boolean }) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PromoForm>({ resolver: zodResolver(promoFormSchema), defaultValues: emptyPromo() });
  useEffect(() => { if (promo) reset(promo === 'new' ? emptyPromo() : promoToForm(promo)); }, [promo, reset]);
  return (
    <Modal open={!!promo} onClose={onClose} title={promo === 'new' ? 'Nouvelle promotion' : 'Modifier la promotion'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={pending} onClick={handleSubmit(onSubmit)}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Code *" placeholder="LANCEMENT5" error={errors.code?.message} {...register('code')} />
        <Input label="Remise en pourcentage *" inputMode="numeric" error={errors.discount_percent?.message} {...register('discount_percent')} />
        <Input label="Durée en mois *" inputMode="numeric" error={errors.duration_months?.message} {...register('duration_months')} />
        <Input label="Nombre de cabinets *" inputMode="numeric" hint="Les premiers cabinets inscrits qui en bénéficient." error={errors.usage_limit?.message} {...register('usage_limit')} />
        <Input label="Début *" type="date" error={errors.starts_on?.message} {...register('starts_on')} />
        <Input label="Fin *" type="date" error={errors.ends_on?.message} {...register('ends_on')} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Packs concernés</p>
          <Controller control={control} name="pack_ids" render={({ field }) => (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
              {packs.map((p) => <label key={p.id} className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={field.value.includes(p.id)} onChange={() => field.onChange(field.value.includes(p.id) ? field.value.filter((x) => x !== p.id) : [...field.value, p.id])} /> {p.name}</label>)}
            </div>
          )} />
          <p className="mt-1 text-xs text-faint">Aucun pack coché : la promotion vaut pour tous les packs.</p>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" className="accent-brand" {...register('is_active')} /> Promotion active</label>
        <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" className="accent-brand" {...register('is_automatic')} /> Offre de lancement automatique</label>
      </form>
    </Modal>
  );
}
