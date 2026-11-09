import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { unprocessableMessage } from '@/core/http/errors';
import { CvForm, cvSchema, emptyCv } from '../models/portail';
import { portailService } from '../services/portail.service';

export const usePortalQuery = () => useQuery({ queryKey: ['portail'], queryFn: portailService.get });

/** Dépôt d'un CV dans la CVthèque du réseau et retrait à la demande du candidat. */
export function useCvViewModel(vivier: number) {
  const [count, setCount] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawn, setWithdrawn] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const form = useForm<CvForm>({ resolver: zodResolver(cvSchema), defaultValues: emptyCv() });
  const deposit = useMutation({
    mutationFn: portailService.depositCv,
    onSuccess: (n) => { setCount(n); setSent(true); setError(null); form.reset(emptyCv()); },
    onError: (e) => setError(unprocessableMessage(e)),
  });
  const withdraw = useMutation({
    mutationFn: portailService.withdrawCv,
    onSuccess: (n) => { setCount(n); setWithdrawn('Votre profil a été retiré du vivier du réseau.'); setWithdrawError(null); },
    onError: (e) => { setWithdrawError(unprocessableMessage(e) ?? 'Aucun profil ne correspond à ce contact'); setWithdrawn(null); },
  });
  return {
    form, submit: form.handleSubmit((f) => { setSent(false); deposit.mutate(f); }), submitting: deposit.isPending, sent, dismiss: () => setSent(false), error,
    vivier: count ?? vivier, withdraw: (c: string) => withdraw.mutate(c), withdrawing: withdraw.isPending, withdrawn, withdrawError, resetWithdraw: () => { setWithdrawn(null); setWithdrawError(null); },
  };
}
