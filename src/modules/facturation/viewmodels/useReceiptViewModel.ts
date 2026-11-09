import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from '@/shared/ui';
import { CANAL_LABEL, Canal } from '@/modules/notifications/models/notification';
import { notificationsService } from '@/modules/notifications/services/notifications.service';
import { facturationService } from '../services/facturation.service';
import { printReceipt, receiptPayment } from '../models/recu';

/** Reçu du dernier paiement d'une facture (ou du paiement indiqué) : partage au propriétaire et impression. */
export function useReceiptViewModel(factureId: string, paymentId?: string) {
  const detail = useQuery({ queryKey: ['invoice', factureId], queryFn: () => facturationService.get(factureId) });
  const share = useMutation({
    mutationFn: (canal: Canal) => notificationsService.send(`/factures/${factureId}/recu/envoi`, canal),
    onSuccess: (to, canal) => toast.success(`Reçu envoyé par ${CANAL_LABEL[canal]} à ${to}`),
  });
  const invoice = detail.data;
  const payment = invoice ? receiptPayment(invoice, paymentId) : undefined;
  return {
    invoice, payment, loading: detail.isLoading || detail.isFetching, sharing: share.isPending, share: (canal: Canal) => share.mutate(canal),
    print: () => { if (invoice && payment && !printReceipt(invoice, payment)) toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); },
  };
}
