import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/core/auth/session.store';
import { toApiError } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { Periode, emptyMoyen, moyenError, MoyenForm } from '../models/abonnement';
import { abonnementService } from '../services/abonnement.service';

/** Renouvellement ou changement de pack : seul écran ouvert quand l'abonnement a expiré (spécification). */
export function useRenewalViewModel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAccess = useSessionStore((s) => s.setAccess);
  const info = useQuery({ queryKey: ['abonnement'], queryFn: abonnementService.get });
  const [packId, setPackId] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>('mensuel');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [moyen, setMoyen] = useState<MoyenForm>(emptyMoyen());
  const [error, setError] = useState<string | null>(null);
  const [moyenErr, setMoyenErr] = useState<string | null>(null);

  const selected = packId ?? info.data?.cabinet.pack.id ?? null;
  const quote = useQuery({
    queryKey: ['abonnement-tarif', selected, periode, appliedCode], enabled: !!selected, retry: false,
    queryFn: () => abonnementService.quote(selected!, periode, appliedCode),
  });
  const quoteError = quote.error ? toApiError(quote.error).message : null;

  const renew = useMutation({
    mutationFn: abonnementService.renew,
    onSuccess: ({ access }) => {
      setAccess(access);
      void queryClient.invalidateQueries();
      toast.success("Abonnement renouvelé, l'accès est rétabli");
      navigate('/', { replace: true });
    },
    onError: (e) => { const err = toApiError(e); if (err.status === 422) setError(err.message); },
  });

  const submit = () => {
    setError(null);
    const m = moyenError(moyen);
    setMoyenErr(m);
    if (m || !selected) return;
    renew.mutate({ packId: selected, periode, codePromo: appliedCode, moyen });
  };

  return {
    info: info.data, loading: info.isLoading, selected, selectPack: setPackId, periode, setPeriode, code, setCode, applyCode: () => setAppliedCode(code.trim()),
    clearCode: () => { setCode(''); setAppliedCode(''); }, appliedCode, quote: quote.data, quoteError, moyen, setMoyen: (m: MoyenForm) => { setMoyen(m); setMoyenErr(null); }, moyenErr, error, submit, paying: renew.isPending,
  };
}
