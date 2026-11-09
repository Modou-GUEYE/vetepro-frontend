import { Link } from 'react-router-dom';
import { MailCheck, TriangleAlert } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { useForgotPasswordViewModel } from '../viewmodels/useForgotPasswordViewModel';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const vm = useForgotPasswordViewModel();
  const { register, formState: { errors } } = vm.form;

  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Saisissez l'adresse e-mail de votre compte pour recevoir un lien de réinitialisation">
      {vm.sentTo ? (
        <div className="space-y-4 text-center">
          <MailCheck size={36} className="mx-auto text-brand" />
          <p className="text-[13px]">Un lien de réinitialisation a été envoyé à <b>{vm.sentTo}</b>. Il est valable <b>3 minutes</b> et ne peut être utilisé qu'une fois.</p>
          <p className="text-xs text-faint">Votre ancien mot de passe reste valable tant que vous n'en avez pas enregistré un nouveau.</p>
        </div>
      ) : (
        <form onSubmit={vm.submit} className="space-y-4" noValidate>
          {vm.error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-pale px-3 py-2 text-[13px] font-semibold text-danger-text">
              <TriangleAlert size={16} className="mt-px shrink-0" /> {vm.error}
            </p>
          )}
          <Input label="Adresse e-mail" type="email" autoComplete="email" autoFocus error={errors.email?.message} {...register('email')} />
          <Button type="submit" className="w-full py-2.5 text-sm" loading={vm.sending}>Envoyer le lien</Button>
        </form>
      )}
      <p className="mt-5 text-center"><Link to="/connexion" className="text-xs font-semibold text-brand hover:underline">Retour à la connexion</Link></p>
    </AuthLayout>
  );
}
