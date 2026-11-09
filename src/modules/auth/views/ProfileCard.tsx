import { Button, Input } from '@/shared/ui';
import { useProfileViewModel } from '../viewmodels/useProfileViewModel';

export function ProfileCard() {
  const vm = useProfileViewModel();
  const { register, formState: { errors } } = vm.form;
  return (
    <div className="rounded-lg2 border border-line bg-white p-5 shadow-card">
      <h3 className="mb-1 text-[15px] font-bold">Mes coordonnées</h3>
      <p className="mb-4 text-xs text-slate">Votre e-mail sert aux messages de la plateforme et à la réinitialisation du mot de passe.</p>
      <form onSubmit={vm.submit} noValidate className="space-y-4">
        <Input label="Identifiant" readOnly value={vm.identifiant} />
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input label="Téléphone" autoComplete="tel" error={errors.telephone?.message} {...register('telephone')} />
        <div className="flex justify-end"><Button type="submit" loading={vm.saving} disabled={!vm.dirty}>Enregistrer</Button></div>
      </form>
    </div>
  );
}
