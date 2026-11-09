import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDeviceId, rememberLogin, rememberedLogin } from '@/core/auth/device';
import { useSessionStore } from '@/core/auth/session.store';
import { toApiError } from '@/core/http/errors';
import { AuthSession, LoginForm, TwoFactorMethod, loginFormSchema } from '../models/auth';
import { authService } from '../services/auth.service';
import { mapLoginError } from './loginErrors';

/** Étapes de la connexion : identifiants, code de vérification (ou code de secours), configuration imposée par le cabinet, remise des codes de secours. */
export type LoginStep =
  | { name: 'credentials' }
  | { name: 'otp'; challengeId: string; methode: TwoFactorMethod; destinataire: string }
  | { name: 'backup'; challengeId: string; methode: TwoFactorMethod; destinataire: string }
  | { name: 'setup-method'; challengeId: string }
  | { name: 'setup-code'; challengeId: string; methode: TwoFactorMethod; destinataire: string }
  | { name: 'codes'; session: AuthSession; codes: string[] };

const RESEND_DELAY = 30;

export function useLoginViewModel() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useSessionStore((s) => s.setSession);
  const [step, setStep] = useState<LoginStep>({ name: 'credentials' });
  const [error, setError] = useState<string | null>(null);
  const [trust, setTrust] = useState(false);
  const [remember, setRemember] = useState(() => rememberedLogin() !== '');
  const [resendIn, setResendIn] = useState(0);
  const state = location.state as { loggedOut?: boolean; from?: string } | null;

  const form = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema), defaultValues: { identifiant: rememberedLogin(), motDePasse: '' } });

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const finish = (session: AuthSession) => {
    setSession(session);
    navigate(state?.from ?? '/', { replace: true });
  };
  const fail = (e: unknown) => setError(toApiError(e).message);

  const login = useMutation({
    mutationFn: (v: LoginForm) => authService.login(v.identifiant, v.motDePasse, getDeviceId()),
    onSuccess: (r, v) => {
      rememberLogin(remember ? v.identifiant.trim() : null);
      if (r.kind === '2fa') { setStep({ name: 'otp', challengeId: r.challengeId, methode: r.methode, destinataire: r.destinataire }); setResendIn(RESEND_DELAY); }
      else if (r.kind === 'setup') setStep({ name: 'setup-method', challengeId: r.challengeId });
      else finish(r.session);
    },
    onError: (e) => setError(mapLoginError(e)),
  });

  const verify = useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) => authService.verifyTwoFactor(challengeId, code, trust, getDeviceId()),
    onSuccess: finish,
    onError: fail,
  });
  const verifyBackup = useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) => authService.verifyBackupCode(challengeId, code),
    onSuccess: finish,
    onError: fail,
  });
  const resend = useMutation({
    mutationFn: (challengeId: string) => authService.resendCode(challengeId),
    onSuccess: (destinataire) => { setError(null); setResendIn(RESEND_DELAY); setStep((s) => (s.name === 'otp' ? { ...s, destinataire } : s)); },
    onError: fail,
  });
  const startSetup = useMutation({
    mutationFn: ({ challengeId, methode }: { challengeId: string; methode: TwoFactorMethod }) => authService.startSetup(challengeId, methode).then((destinataire) => ({ challengeId, methode, destinataire })),
    onSuccess: (r) => setStep({ name: 'setup-code', ...r }),
    onError: fail,
  });
  const confirmSetup = useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) => authService.confirmSetup(challengeId, code),
    onSuccess: (r) => setStep({ name: 'codes', session: r.session, codes: r.codes }),
    onError: fail,
  });

  const clear = () => setError(null);
  return {
    form, step, loggedOut: (state?.loggedOut ?? false) && step.name === 'credentials', error, trust, setTrust, remember, setRemember, resendIn,
    submitting: login.isPending || verify.isPending || verifyBackup.isPending || startSetup.isPending || confirmSetup.isPending,
    resending: resend.isPending,
    submit: form.handleSubmit((v) => { clear(); login.mutate(v); }),
    submitCode: (challengeId: string, code: string) => { clear(); verify.mutate({ challengeId, code }); },
    submitBackup: (challengeId: string, code: string) => { clear(); verifyBackup.mutate({ challengeId, code }); },
    resendCode: (challengeId: string) => { clear(); resend.mutate(challengeId); },
    chooseMethod: (challengeId: string, methode: TwoFactorMethod) => { clear(); startSetup.mutate({ challengeId, methode }); },
    submitSetupCode: (challengeId: string, code: string) => { clear(); confirmSetup.mutate({ challengeId, code }); },
    useBackup: () => { clear(); setStep((s) => (s.name === 'otp' ? { ...s, name: 'backup' } : s)); },
    backToCode: () => { clear(); setStep((s) => (s.name === 'backup' ? { ...s, name: 'otp' } : s)); },
    backToCredentials: () => { clear(); setStep({ name: 'credentials' }); form.setValue('motDePasse', ''); },
    continueAfterCodes: () => { if (step.name === 'codes') finish(step.session); },
  };
}
