import { TriangleAlert } from 'lucide-react';
import { MODULES, cellState } from '@/core/auth/permissions';
import { useSessionStore } from '@/core/auth/session.store';
import { Badge, Button, PasswordInput } from '@/shared/ui';
import { PermissionMatrix } from '@/modules/administration/views/PermissionMatrix';
import { useChangePasswordViewModel } from '../viewmodels/useChangePasswordViewModel';
import { PasswordStrength } from './PasswordStrength';
import { ProfileCard } from './ProfileCard';
import { TwoFactorCard } from './TwoFactorCard';

const STATUT = { essai: 'Période d\'essai', actif: 'Abonnement actif', expire: 'Abonnement expiré' } as const;

export function AccountPage() {
  const { user, permissions, abonnement } = useSessionStore();
  const vm = useChangePasswordViewModel();

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-5">
        <div className="rounded-lg2 border border-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-[15px] font-bold">Mon profil</h3>
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
            <dt className="text-slate">Nom</dt><dd className="font-semibold">{user?.nom}</dd>
            <dt className="text-slate">Profil</dt><dd><Badge tone="blue">{user?.profil}</Badge></dd>
            <dt className="text-slate">Cabinet</dt><dd>{user?.cabinetNom}</dd>
            <dt className="text-slate">Abonnement</dt>
            <dd>
              <Badge tone={abonnement?.statut === 'expire' ? 'red' : 'green'}>{abonnement ? STATUT[abonnement.statut] : '—'}</Badge>
              {abonnement?.statut === 'essai' && abonnement.joursRestants !== undefined && <span className="ml-2 text-xs text-slate">{abonnement.joursRestants} jours restants</span>}
            </dd>
          </dl>
        </div>

        <ProfileCard />

        <TwoFactorCard />

        <div className="rounded-lg2 border border-line bg-white p-5 shadow-card">
          <h3 className="mb-1 text-[15px] font-bold">Changer mon mot de passe</h3>
          <p className="mb-4 text-xs text-slate">Votre ancien mot de passe reste valable jusqu'à l'enregistrement du nouveau.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (vm.canSubmit) vm.submit(); }} className="space-y-4">
            {vm.error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-pale px-3 py-2 text-[13px] font-semibold text-danger-text">
                <TriangleAlert size={16} className="mt-px shrink-0" /> {vm.error}
              </p>
            )}
            <PasswordInput label="Mot de passe actuel" autoComplete="current-password" value={vm.current} onChange={(e) => vm.setCurrent(e.target.value)} />
            <PasswordInput label="Nouveau mot de passe" autoComplete="new-password" value={vm.password} onChange={(e) => vm.setPassword(e.target.value)}
              error={vm.sameAsCurrent ? "Le nouveau mot de passe doit être différent de l'actuel" : undefined} />
            <PasswordStrength value={vm.password} />
            <PasswordInput label="Confirmer le nouveau mot de passe" autoComplete="new-password" value={vm.confirm} onChange={(e) => vm.setConfirm(e.target.value)}
              error={vm.mismatch ? 'Les deux mots de passe ne correspondent pas' : undefined} />
            <div className="flex justify-end"><Button type="submit" loading={vm.sending} disabled={!vm.canSubmit}>Enregistrer</Button></div>
          </form>
        </div>
      </section>

      <section className="h-fit rounded-lg2 border border-line bg-white p-5 shadow-card">
        <h3 className="mb-1 text-[15px] font-bold">Mes droits</h3>
        <p className="mb-4 text-xs text-slate">Droits de votre profil, avec les exceptions éventuelles accordées par l'Administrateur. Ils sont modifiables uniquement par lui.</p>
        <PermissionMatrix readOnly cell={(m, a) => cellState(permissions, {}, m, a)} onToggle={() => undefined} />
        <p className="mt-3 text-xs text-faint">{MODULES.filter((m) => permissions[m]?.length).length} modules accessibles.</p>
      </section>
    </div>
  );
}
