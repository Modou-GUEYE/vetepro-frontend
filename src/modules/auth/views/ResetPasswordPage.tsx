import { Link } from 'react-router-dom';
import { CheckCircle2, LinkIcon, TriangleAlert } from 'lucide-react';
import { Button, PasswordInput } from '@/shared/ui';
import { useResetPasswordViewModel } from '../viewmodels/useResetPasswordViewModel';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';

export function ResetPasswordPage() {
  const vm = useResetPasswordViewModel();

  if (vm.invalidLink) {
    return (
      <AuthLayout title="Lien expiré">
        <div className="space-y-4 text-center">
          <LinkIcon size={36} className="mx-auto text-amber" />
          <p className="text-[13px]">Ce lien de réinitialisation n'est plus valable (3 minutes, usage unique). Demandez-en un nouveau.</p>
          <Link to="/mot-de-passe-oublie"><Button className="w-full">Recevoir un nouveau lien</Button></Link>
        </div>
      </AuthLayout>
    );
  }

  if (vm.done) {
    return (
      <AuthLayout title="Mot de passe modifié">
        <div className="space-y-4 text-center">
          <CheckCircle2 size={36} className="mx-auto text-brand" />
          <p className="text-[13px]">Votre nouveau mot de passe est enregistré. Vous pouvez vous connecter.</p>
          <Link to="/connexion"><Button className="w-full">Aller à la connexion</Button></Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un mot de passe que vous n'utilisez pas ailleurs">
      <form onSubmit={(e) => { e.preventDefault(); if (vm.canSubmit) vm.submit(); }} className="space-y-4">
        {vm.error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-pale px-3 py-2 text-[13px] font-semibold text-danger-text">
            <TriangleAlert size={16} className="mt-px shrink-0" /> {vm.error}
          </p>
        )}
        <PasswordInput label="Nouveau mot de passe" autoComplete="new-password" autoFocus value={vm.password} onChange={(e) => vm.setPassword(e.target.value)} />
        <PasswordStrength value={vm.password} />
        <PasswordInput label="Confirmer le mot de passe" autoComplete="new-password" value={vm.confirm} onChange={(e) => vm.setConfirm(e.target.value)}
          error={vm.mismatch ? 'Les deux mots de passe ne correspondent pas' : undefined} />
        <Button type="submit" className="w-full py-2.5 text-sm" loading={vm.sending} disabled={!vm.canSubmit}>Enregistrer</Button>
      </form>
    </AuthLayout>
  );
}
