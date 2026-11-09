import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { formatFcfa } from '@/core/utils/format';
import { toast } from '@/shared/ui';
import { clock, secondsLeft } from '../models/paiements';
import { paiementsService } from '../services/paiements.service';

/** Suivi en direct d'une transaction : relue toutes les 2 secondes tant qu'elle est en attente, avec compte à rebours. */
export function useTransactionViewModel(txId: string, onReplace: (id: string) => void) {
  const queryClient = useQueryClient();
  const can = useCan();
  const [now, setNow] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ['paiement-tx', txId], queryFn: () => paiementsService.get(txId),
    refetchInterval: (q) => (q.state.data?.statut === 'attente' ? 2000 : false),
  });
  const tx = query.data;
  const pending = tx?.statut === 'attente';

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending]);

  /** Une confirmation met à jour la facture : les écrans qui la montrent doivent la relire. */
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    if (tx && tx.statut !== 'attente' && seen !== `${tx.id}:${tx.statut}`) {
      setSeen(`${tx.id}:${tx.statut}`);
      for (const k of ['invoices', 'invoice', 'paiements', 'paiement-tx-list']) void queryClient.invalidateQueries({ queryKey: [k] });
      if (tx.statut === 'succes') toast.success(`Paiement ${tx.canal} confirmé : ${formatFcfa(tx.montant)}`);
    }
  }, [tx, seen, queryClient]);

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['paiement-tx', txId] }); void queryClient.invalidateQueries({ queryKey: ['paiements'] }); };
  const cancel = useMutation({ mutationFn: () => paiementsService.cancel(txId), onSuccess: () => { toast.success('Transaction annulée'); refresh(); } });
  const relaunch = useMutation({
    mutationFn: () => paiementsService.relaunch(txId),
    onSuccess: (t) => { toast.success(t.id === txId ? `Demande renvoyée à ${t.alias}` : 'Nouvelle transaction lancée'); if (t.id !== txId) onReplace(t.id); refresh(); },
  });
  const simulate = useMutation({ mutationFn: (r: 'succes' | 'refus') => paiementsService.simulate(txId, r), onSuccess: refresh });

  const left = tx ? secondsLeft(tx.expire_a, now) : 0;
  return {
    tx, loading: query.isLoading, countdown: clock(left),
    canAct: can('facturation', 'update'), canRefund: can('paiements', 'delete'),
    cancel: () => cancel.mutate(), cancelling: cancel.isPending,
    relaunch: () => relaunch.mutate(), relaunching: relaunch.isPending,
    simulate: (r: 'succes' | 'refus') => simulate.mutate(r), simulating: simulate.isPending,
  };
}
