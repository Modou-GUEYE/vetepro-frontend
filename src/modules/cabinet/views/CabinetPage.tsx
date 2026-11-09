import { ImagePlus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button, Input, Skeleton } from '@/shared/ui';
import { useCabinetViewModel } from '../viewmodels/useCabinetViewModel';

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-lg2 border border-line bg-white p-5 shadow-card">
    <h3 className="text-[15px] font-bold">{title}</h3>
    {hint && <p className="mb-4 mt-1 text-xs text-slate">{hint}</p>}
    <div className={hint ? '' : 'mt-4'}>{children}</div>
  </section>
);

export function CabinetPage() {
  const vm = useCabinetViewModel();
  const { register, watch, formState: { errors } } = vm.form;
  const logo = watch('logo');
  const ro = !vm.canEdit;

  if (vm.loading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  return (
    <form onSubmit={vm.submit} noValidate className="mx-auto max-w-[820px] space-y-5">
      <Section title="Identité du cabinet" hint="Ces informations figurent sur les factures, les reçus et les ordonnances.">
        <div className="flex flex-wrap items-center gap-4 pb-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-mist text-faint">
            {logo ? <img src={logo} alt="Logo du cabinet" className="h-full w-full object-contain" /> : <ImagePlus size={26} />}
          </div>
          <div className="space-y-1.5 text-xs text-slate">
            <div className="flex gap-2">
              <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold hover:bg-mist ${ro ? 'pointer-events-none opacity-50' : ''}`}>
                <ImagePlus size={13} /> {logo ? 'Changer le logo' : 'Ajouter un logo'}
                <input type="file" accept="image/png,image/jpeg" className="sr-only" disabled={ro} onChange={(e) => { vm.chooseLogo(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {logo && !ro && <Button type="button" size="sm" variant="danger" onClick={vm.removeLogo}><Trash2 size={13} /> Retirer</Button>}
            </div>
            <p>PNG ou JPG, 2 Mo au plus.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nom du cabinet *" readOnly={ro} error={errors.nom?.message} {...register('nom')} />
          <Input label="N° d'ordre vétérinaire *" placeholder="ODVS-0000" readOnly={ro} error={errors.ordre?.message} {...register('ordre')} />
        </div>
      </Section>

      <Section title="Coordonnées">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input wrapperClassName="sm:col-span-2" label="Adresse *" readOnly={ro} error={errors.adresse?.message} {...register('adresse')} />
          <Input label="Téléphone *" readOnly={ro} error={errors.telephone?.message} {...register('telephone')} />
          <Input label="E-mail *" type="email" readOnly={ro} error={errors.email?.message} {...register('email')} />
        </div>
      </Section>

      <Section title="Sécurité" hint="La double authentification se met à disposition de l'établissement qui le souhaite.">
        <label className="flex items-start gap-3 text-[13px]">
          <input type="checkbox" disabled={ro} className="mt-0.5 accent-brand" {...register('twofaObligatoire')} />
          <span><b className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> Rendre la double authentification obligatoire pour tous les utilisateurs du cabinet</b>
            <span className="text-xs text-slate">À leur prochaine connexion, chaque utilisateur doit configurer sa double authentification. Elle ne peut plus être désactivée.</span></span>
        </label>
      </Section>

      {vm.canEdit ? (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={vm.cancel} disabled={!vm.dirty}>Annuler les modifications</Button>
          <Button type="submit" loading={vm.saving} disabled={!vm.dirty}>Enregistrer</Button>
        </div>
      ) : <p className="text-center text-xs text-faint">Seul l'Administrateur peut modifier ces informations.</p>}
    </form>
  );
}
