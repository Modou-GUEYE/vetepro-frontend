import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { useSendDocument } from '@/modules/notifications/viewmodels/useSendDocument';
import { toast } from '@/shared/ui';
import { formatFcfa } from '@/core/utils/format';
import { paiementsService } from '@/modules/paiements/services/paiements.service';
import type { Canal, Methode } from '@/modules/paiements/models/paiements';
import { unprocessableMessage } from '@/core/http/errors';
import { facturationService } from '../services/facturation.service';
import { printInvoice } from '../models/printInvoice';

/** Détail d'une facture avec ses actions : encaisser (paiement partiel ou solde), avoir, impression. */
export function useInvoiceDetailViewModel(id: string) {
  const queryClient = useQueryClient();
  const can = useCan();
  const [panel, setPanel] = useState<'pay' | 'credit' | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState(false);
  const [electronicError, setElectronicError] = useState<string | null>(null);
  const channel = useSendDocument(`/factures/${id}/recu/envoi`, 'Reçu');
  const detail = useQuery({ queryKey: ['invoice', id], queryFn: () => facturationService.get(id) });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
  };

  const pay = useMutation({
    mutationFn: ({ montant, mode }: { montant: number; mode: string }) => facturationService.pay(id, montant, mode),
    onSuccess: (inv, v) => { toast.success(`Paiement de ${formatFcfa(v.montant)} enregistré${inv.reste === 0 ? ', facture soldée' : ''}`); setPanel(null); refresh(); setReceipt(true); },
  });
  /** Paiement électronique : la facture ne change qu'à la confirmation de l'opérateur (suivi dans la fenêtre de transaction). */
  const electronic = useMutation({
    mutationFn: (v: { canal: Canal; methode: Methode; alias: string; montant: number }) => paiementsService.start(id, v),
    onSuccess: (t) => { setElectronicError(null); setPanel(null); setTxId(t.id); void queryClient.invalidateQueries({ queryKey: ['paiements'] }); },
    onError: (e) => setElectronicError(unprocessableMessage(e)),
  });
  const credit = useMutation({
    mutationFn: ({ montant, motif }: { montant: number; motif: string }) => facturationService.credit(id, montant, motif),
    onSuccess: (_i, v) => { toast.success(`Avoir de ${formatFcfa(v.montant)} émis`); setPanel(null); refresh(); },
  });

  const inv = detail.data;
  return {
    channel, invoice: inv, loading: detail.isLoading, panel, setPanel,
    canPay: can('facturation', 'update') && !!inv && inv.reste > 0 && inv.statut !== 'annulee',
    canCredit: can('facturation', 'delete') && !!inv && inv.statut !== 'annulee',
    receipt, setReceipt, txId, setTxId, electronicError, startingElectronic: electronic.isPending,
    submitElectronic: (canal: Canal, methode: Methode, alias: string, montant: number) => electronic.mutate({ canal, methode, alias, montant }),
    paying: pay.isPending, submitPayment: (montant: number, mode: string) => pay.mutate({ montant, mode }),
    crediting: credit.isPending, submitCredit: (montant: number, motif: string) => credit.mutate({ montant, motif }),
    print: () => { if (inv && !printInvoice(inv)) toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); },
  };
}
