import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { unprocessableMessage } from '@/core/http/errors';
import { formatFcfa } from '@/core/utils/format';
import { toast } from '@/shared/ui';
import { Canal, Methode, Suspens, Transaction, TxFilters, emptyTxFilters } from '../models/paiements';
import { paiementsService } from '../services/paiements.service';

export type PaiementsTab = 'transactions' | 'remboursements' | 'non-identifies';

/** Écran Paiements : transactions électroniques, remboursements (Administrateur) et paiements reçus sans facture identifiable. */
export function usePaiementsViewModel() {
  const can = useCan();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PaiementsTab>('transactions');
  const [filters, setFilters] = useState<TxFilters>(emptyTxFilters());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<Transaction | null>(null);
  const [processing, setProcessing] = useState<Suspens | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({ queryKey: ['paiements', 'list', filters], queryFn: () => paiementsService.list(filters), refetchInterval: 10_000 });
  const refunds = useQuery({ queryKey: ['paiements', 'refunds'], queryFn: paiementsService.refunds, enabled: tab === 'remboursements' });
  const suspens = useQuery({ queryKey: ['paiements', 'suspens'], queryFn: paiementsService.suspens, enabled: tab === 'non-identifies' });
  const openInvoices = useQuery({ queryKey: ['paiements', 'open-invoices', processing?.alias ?? ''], queryFn: () => paiementsService.openInvoices(processing?.alias ?? ''), enabled: !!processing || creating });

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['paiements'] }); void queryClient.invalidateQueries({ queryKey: ['invoices'] }); void queryClient.invalidateQueries({ queryKey: ['invoice'] }); };
  const onError = (e: unknown) => setError(unprocessableMessage(e));

  const refund = useMutation({
    mutationFn: (v: { id: string; montant: number; motif: string; canal: string; avoir: boolean }) => paiementsService.refund(v.id, { montant: v.montant, motif: v.motif, canal: v.canal, avoir: v.avoir }),
    onSuccess: (_r, v) => { toast.success(`Remboursement de ${formatFcfa(v.montant)} enregistré, avoir émis`); setRefunding(null); setError(null); refresh(); }, onError,
  });
  const attach = useMutation({
    mutationFn: (v: { id: string; factureId: string }) => paiementsService.attach(v.id, v.factureId),
    onSuccess: () => { toast.success('Paiement rattaché à la facture'); setProcessing(null); setError(null); refresh(); }, onError,
  });
  const refundSuspens = useMutation({
    mutationFn: (v: { id: string; motif: string }) => paiementsService.refundSuspens(v.id, v.motif),
    onSuccess: () => { toast.success('Paiement remboursé au payeur'); setProcessing(null); setError(null); refresh(); }, onError,
  });
  const cancel = useMutation({ mutationFn: paiementsService.cancel, onSuccess: () => { toast.success('Transaction annulée'); refresh(); } });
  const relaunch = useMutation({
    mutationFn: paiementsService.relaunch,
    onSuccess: (t) => { toast.success('Nouvelle transaction lancée'); setDetailId(t.id); refresh(); },
  });
  const start = useMutation({
    mutationFn: paiementsService.startFromPage,
    onSuccess: (t) => { setCreating(false); setError(null); setDetailId(t.id); refresh(); }, onError,
  });
  const expiration = useMutation({
    mutationFn: paiementsService.setExpiration,
    onSuccess: (_r, m) => { toast.success(`Délai d'expiration réglé à ${m} min`); setError(null); refresh(); }, onError,
  });

  return {
    tab, setTab, filters, setFilters: (f: Partial<TxFilters>) => setFilters((p) => ({ ...p, ...f })), resetFilters: () => setFilters(emptyTxFilters()),
    transactions: list.data?.items ?? [], stats: list.data?.stats, expirationMin: list.data?.expiration_min ?? 5, loading: list.isLoading,
    refunds: refunds.data ?? [], suspens: suspens.data ?? [], openInvoices: openInvoices.data ?? [],
    detailId, openDetail: setDetailId, closeDetail: () => setDetailId(null),
    refunding, openRefund: (t: Transaction) => { setError(null); setRefunding(t); }, closeRefund: () => setRefunding(null),
    processing, openProcess: (s: Suspens) => { setError(null); setProcessing(s); }, closeProcess: () => setProcessing(null),
    creating, openCreate: () => { setError(null); setCreating(true); }, closeCreate: () => setCreating(false),
    startPayment: (b: { facture_id: string | null; canal: Canal; methode: Methode; alias: string; montant: number; libelle: string }) => start.mutate(b), startingPayment: start.isPending,
    canCreate: can('paiements', 'create'),
    error, canRefund: can('paiements', 'delete'), canManage: can('paiements', 'update'),
    submitRefund: (id: string, montant: number, motif: string, canal: string, avoir: boolean) => refund.mutate({ id, montant, motif, canal, avoir }), refundBusy: refund.isPending,
    submitAttach: (id: string, factureId: string) => attach.mutate({ id, factureId }), attaching: attach.isPending,
    submitRefundSuspens: (id: string, motif: string) => refundSuspens.mutate({ id, motif }), refundingSuspens: refundSuspens.isPending,
    cancelTx: (id: string) => cancel.mutate(id), relaunchTx: (id: string) => relaunch.mutate(id), rowBusy: cancel.isPending || relaunch.isPending,
    canAct: can('facturation', 'update'),
    setExpiration: (m: number) => expiration.mutate(m), savingExpiration: expiration.isPending,
  };
}
