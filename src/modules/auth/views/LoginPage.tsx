import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useSessionStore } from '@/core/auth/session.store';
import { Button, Input, PasswordInput } from '@/shared/ui';
import { DEMO_USERS } from '@/mocks/authDb';
import { METHOD_LABEL, TwoFactorMethod } from '../models/auth';
import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { AuthLayout } from './AuthLayout';
import { BackupCodes } from './BackupCodes';
import { MethodPicker } from './MethodPicker';
import { OtpInput } from './OtpInput';

type Vm = ReturnType<typeof useLoginViewModel>;

const Alert = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-danger-pale px-3 py-2 text-[13px] font-semibold text-danger-text"><TriangleAlert size={16} className="mt-px shrink-0" /> {children}</p>
);
const BackButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[13px] text-slate hover:text-ink"><ArrowLeft size={14} /> {children}</button>
);
const sentTo = (methode: TwoFactorMethod, destinataire: string) => (methode === 'app' ? `Saisissez le code affiché par ${destinataire}.` : `Un code a été envoyé par ${METHOD_LABEL[methode]} à ${destinataire}.`);
const SIMULATION = import.meta.env.DEV && <p className="mb-3 rounded-lg bg-info-pale px-3 py-2 text-xs text-info-text">Simulation : le code de démonstration est <b className="tracking-widest">123456</b>.</p>;

function Credentials({ vm }: { vm: Vm }) {
  const { register, formState: { errors }, setValue } = vm.form;
  return (
    <>
      {vm.loggedOut && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-brand-pale px-3 py-2 text-[13px] font-semibold text-brand-text"><CheckCircle2 size={16} /> Déconnexion réussie</p>
      )}
      {vm.error && <Alert>{vm.error}</Alert>}
      <form onSubmit={vm.submit} className="space-y-4" noValidate>
        <Input label="Identifiant" autoComplete="username" placeholder="Nom d'utilisateur" autoFocus error={errors.identifiant?.message} {...register('identifiant')} />
        <PasswordInput label="Mot de passe" autoComplete="current-password" error={errors.motDePasse?.message} {...register('motDePasse')} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={vm.remember} onChange={(e) => vm.setRemember(e.target.checked)} className="accent-brand" /> Se souvenir de moi</label>
          <Link to="/mot-de-passe-oublie" className="text-xs font-semibold text-brand hover:underline">Mot de passe oublié ?</Link>
        </div>
        <Button type="submit" className="w-full py-2.5 text-sm" loading={vm.submitting}>Se connecter</Button>
      </form>
      {import.meta.env.DEV && (
        <details className="mt-6 rounded-lg border border-line p-3 text-xs text-slate">
          <summary className="cursor-pointer font-semibold">Comptes de démonstration</summary>
          <ul className="mt-2 space-y-1">
            {DEMO_USERS.map((u) => (
              <li key={u.id}>
                <button type="button" className="text-left hover:text-brand" onClick={() => { setValue('identifiant', u.identifiant); setValue('motDePasse', u.motDePasse); }}>
                  <b>{u.identifiant}</b> ({u.nom}){!u.actif ? ' (désactivé)' : u.twofa ? ' (code 123456)' : u.twofaRequise ? ' (double authentification à configurer)' : u.cabinetId === '2' ? ' (abonnement expiré)' : u.cabinetId === '3' ? ' (essai, pack Découverte)' : u.cabinetId === '5' ? ' (échéance proche, pack Découverte)' : u.cabinetId === '0' ? ' (association)' : ''}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Otp({ vm, step }: { vm: Vm; step: Extract<Vm['step'], { name: 'otp' }> }) {
  const [code, setCode] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) vm.submitCode(step.challengeId, code); }} className="space-y-4">
      {vm.error && <Alert>{vm.error}</Alert>}
      <p className="text-[13px] text-slate">{sentTo(step.methode, step.destinataire)}</p>
      <OtpInput value={code} onChange={setCode} autoFocus disabled={vm.submitting} />
      {SIMULATION}
      <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={vm.trust} onChange={(e) => vm.setTrust(e.target.checked)} className="accent-brand" /> Faire confiance à cet appareil pendant 30 jours</label>
      <Button type="submit" className="w-full py-2.5 text-sm" loading={vm.submitting} disabled={code.length !== 6}>Vérifier</Button>
      <div className="flex items-center justify-between text-xs font-semibold">
        <button type="button" onClick={() => vm.useBackup()} className="text-brand hover:underline">Utiliser un code de secours</button>
        {step.methode !== 'app' && (
          <button type="button" disabled={vm.resendIn > 0 || vm.resending} onClick={() => vm.resendCode(step.challengeId)} className="text-brand hover:underline disabled:text-faint disabled:no-underline">
            {vm.resendIn > 0 ? `Renvoyer le code (${vm.resendIn} s)` : 'Renvoyer le code'}
          </button>
        )}
      </div>
    </form>
  );
}

function Backup({ vm, step }: { vm: Vm; step: Extract<Vm['step'], { name: 'backup' }> }) {
  const [code, setCode] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) vm.submitBackup(step.challengeId, code); }} className="space-y-4">
      {vm.error && <Alert>{vm.error}</Alert>}
      <p className="text-[13px] text-slate">Saisissez un de vos codes de secours. Chaque code ne sert qu'une fois.</p>
      <Input label="Code de secours" placeholder="XXXX-XXXX" autoComplete="off" autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <Button type="submit" className="w-full py-2.5 text-sm" loading={vm.submitting} disabled={code.trim().length < 8}>Vérifier</Button>
      <button type="button" onClick={vm.backToCode} className="w-full text-center text-xs font-semibold text-brand hover:underline">Revenir au code reçu</button>
    </form>
  );
}

function SetupMethod({ vm, step }: { vm: Vm; step: Extract<Vm['step'], { name: 'setup-method' }> }) {
  const [methode, setMethode] = useState<TwoFactorMethod>('sms');
  return (
    <div className="space-y-4">
      {vm.error && <Alert>{vm.error}</Alert>}
      <MethodPicker value={methode} onChange={setMethode} />
      <Button className="w-full py-2.5 text-sm" loading={vm.submitting} onClick={() => vm.chooseMethod(step.challengeId, methode)}>Recevoir un code</Button>
    </div>
  );
}

function SetupCode({ vm, step }: { vm: Vm; step: Extract<Vm['step'], { name: 'setup-code' }> }) {
  const [code, setCode] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) vm.submitSetupCode(step.challengeId, code); }} className="space-y-4">
      {vm.error && <Alert>{vm.error}</Alert>}
      <p className="text-[13px] text-slate">{sentTo(step.methode, step.destinataire)} Saisissez-le pour activer la double authentification.</p>
      <OtpInput value={code} onChange={setCode} autoFocus disabled={vm.submitting} />
      {SIMULATION}
      <Button type="submit" className="w-full py-2.5 text-sm" loading={vm.submitting} disabled={code.length !== 6}>Activer</Button>
    </form>
  );
}

function Codes({ vm, step }: { vm: Vm; step: Extract<Vm['step'], { name: 'codes' }> }) {
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg bg-brand-pale px-3 py-2 text-[13px] text-brand-text"><ShieldCheck size={16} className="mt-px shrink-0" /> La double authentification est activée. Gardez ces codes : ils ne s'affichent qu'une fois.</p>
      <BackupCodes codes={step.codes} />
      <Button className="w-full py-2.5 text-sm" onClick={vm.continueAfterCodes}>J'ai enregistré mes codes, continuer</Button>
    </div>
  );
}

export function LoginPage() {
  const vm = useLoginViewModel();
  const token = useSessionStore((s) => s.accessToken);
  const { step } = vm;

  // La session n'est enregistrée qu'après la remise des codes de secours : jusque-là, on reste sur l'écran.
  if (token && step.name !== 'codes') return <Navigate to="/" replace />;

  const titles: Record<typeof step.name, [string, string?]> = {
    credentials: ['Connexion', "Accédez à l'espace membre de votre cabinet"],
    otp: ['Vérification en deux étapes'],
    backup: ['Code de secours'],
    'setup-method': ['Double authentification requise', "L'administrateur de votre cabinet a rendu la double authentification obligatoire. Configurez-la pour continuer."],
    'setup-code': ['Confirmez la méthode'],
    codes: ['Codes de secours'],
  };
  const [title, subtitle] = titles[step.name];

  return (
    <AuthLayout title={title} subtitle={subtitle} back={step.name === 'otp' || step.name === 'setup-method' || step.name === 'setup-code' ? <BackButton onClick={vm.backToCredentials}>Changer de compte</BackButton> : undefined}>
      {step.name === 'credentials' && <Credentials vm={vm} />}
      {step.name === 'otp' && <Otp vm={vm} step={step} />}
      {step.name === 'backup' && <Backup vm={vm} step={step} />}
      {step.name === 'setup-method' && <SetupMethod vm={vm} step={step} />}
      {step.name === 'setup-code' && <SetupCode vm={vm} step={step} />}
      {step.name === 'codes' && <Codes vm={vm} step={step} />}
    </AuthLayout>
  );
}
