import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, Textarea } from '@/shared/ui';
import { COMMITMENT_OPTIONS, PackForm, PlatformModule, PlatformPack, emptyPack, packFormSchema, packToForm } from '../models/offres';

const engagementLabel = (months: number) => (months === 0 ? 'Sans engagement' : `${months} mois`);

export function PackFormModal({ pack, modules, onClose, onSubmit, pending }: { pack: PlatformPack | 'new' | null; modules: PlatformModule[]; onClose: () => void; onSubmit: (f: PackForm) => void; pending: boolean }) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PackForm>({ resolver: zodResolver(packFormSchema), defaultValues: emptyPack() });
  useEffect(() => { if (pack) reset(pack === 'new' ? emptyPack() : packToForm(pack)); }, [pack, reset]);
  return (
    <Modal open={!!pack} onClose={onClose} size="lg" title={pack === 'new' ? 'Nouvelle offre' : "Modifier l'offre"}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={pending} onClick={handleSubmit(onSubmit)}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nom de l'offre *" error={errors.name?.message} {...register('name')} />
        <Input label="Cible" placeholder="Cabinet individuel" {...register('target')} />
        <Input label="Tarif mensuel par cabinet (FCFA) *" inputMode="decimal" error={errors.monthly_price?.message} {...register('monthly_price')} />
        <Input label="Tarif annuel par cabinet (FCFA) *" inputMode="decimal" error={errors.annual_price?.message} {...register('annual_price')} />
        <Controller control={control} name="commitment_months" render={({ field }) => {
          const options: number[] = [...COMMITMENT_OPTIONS];
          if (!options.includes(Number(field.value))) options.push(Number(field.value));
          return (
            <label className="block text-[13px] font-medium">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Engagement</span>
              <select className="w-full rounded-lg border border-line bg-white px-3 py-2" value={field.value} onChange={field.onChange}>
                {options.map((m) => <option key={m} value={String(m)}>{engagementLabel(m)}</option>)}
              </select>
            </label>
          );
        }} />
        <Input label="Utilisateurs maximum" inputMode="numeric" hint="Vide : aucun plafond." error={errors.user_limit?.message} {...register('user_limit')} />
        <div className="flex flex-col justify-end gap-2 pb-1 text-[13px] font-medium sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand" {...register('is_featured')} /> Mettre en avant (« Le plus choisi »), un seul pack à la fois</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand" {...register('is_published')} /> Offre publiée sur le portail</label>
        </div>
        <Textarea wrapperClassName="sm:col-span-2" label="Fonctionnalités affichées" rows={4} hint="Une fonctionnalité par ligne." {...register('features')} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Modules</p>
          <Controller control={control} name="module_codes" render={({ field }) => {
            const known = new Set(modules.map((m) => m.code));
            const items = [...modules, ...field.value.filter((c) => !known.has(c)).map((c) => ({ code: c, label: c }))];
            const toggle = (code: string) => field.onChange(field.value.includes(code) ? field.value.filter((c) => c !== code) : [...field.value, code]);
            return (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
                {items.map((m) => <label key={m.code} className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={field.value.includes(m.code)} onChange={() => toggle(m.code)} /> {m.label}</label>)}
              </div>
            );
          }} />
        </div>
      </form>
    </Modal>
  );
}
