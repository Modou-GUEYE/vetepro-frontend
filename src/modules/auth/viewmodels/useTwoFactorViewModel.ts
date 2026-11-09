import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { TwoFactorMethod } from '../models/auth';
import { authService } from '../services/auth.service';

export type TwoFactorDialog =
  | { name: 'method' }
  | { name: 'code'; methode: TwoFactorMethod; destinataire: string }
  | { name: 'codes'; codes: string[]; renewed: boolean }
  | { name: 'password'; action: 'disable' | 'renew' };

/** Double authentification dans Mon compte : état, activation en trois temps (méthode, code, codes de secours), désactivation et nouveaux codes avec le mot de passe. */
export function useTwoFactorViewModel() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<TwoFactorDialog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = useQuery({ queryKey: ['2fa'], queryFn: authService.twofaStatus });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['2fa'] });
  const fail = (e: unknown) => setError(toApiError(e).message);
  const open = (d: TwoFactorDialog | null) => { setError(null); setDialog(d); };

  const start = useMutation({
    mutationFn: (methode: TwoFactorMethod) => authService.startActivation(methode).then((destinataire) => ({ methode, destinataire })),
    onSuccess: (r) => open({ name: 'code', ...r }),
    onError: fail,
  });
  const confirm = useMutation({
    mutationFn: (code: string) => authService.confirmActivation(code),
    onSuccess: (codes) => { open({ name: 'codes', codes, renewed: false }); void refresh(); toast.success('Double authentification activée'); },
    onError: fail,
  });
  const disable = useMutation({
    mutationFn: (motDePasse: string) => authService.disableTwofa(motDePasse),
    onSuccess: () => { open(null); void refresh(); toast.success('Double authentification désactivée'); },
    onError: fail,
  });
  const renew = useMutation({
    mutationFn: (motDePasse: string) => authService.renewBackupCodes(motDePasse),
    onSuccess: (codes) => { open({ name: 'codes', codes, renewed: true }); void refresh(); },
    onError: fail,
  });

  return {
    status: status.data, loading: status.isLoading, dialog, error, busy: start.isPending || confirm.isPending || disable.isPending || renew.isPending,
    openActivation: () => open({ name: 'method' }), openPassword: (action: 'disable' | 'renew') => open({ name: 'password', action }), close: () => open(null),
    chooseMethod: (m: TwoFactorMethod) => { setError(null); start.mutate(m); },
    confirmCode: (code: string) => { setError(null); confirm.mutate(code); },
    submitPassword: (action: 'disable' | 'renew', motDePasse: string) => { setError(null); (action === 'disable' ? disable : renew).mutate(motDePasse); },
  };
}
