import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSendDocument } from '@/modules/notifications/viewmodels/useSendDocument';
import { useCan } from '@/core/auth/permissions';
import { toast } from '@/shared/ui';
import { printOrdonnance } from '../models/printOrdonnance';
import { consultationsService } from '../services/consultations.service';

export function useConsultationDetailViewModel(id: string) {
  const can = useCan();
  const [invoicing, setInvoicing] = useState(false);
  const detail = useQuery({ queryKey: ['consultation', id], queryFn: () => consultationsService.get(id) });
  const send = useSendDocument(`/consultations/${id}/ordonnance/envoi`, 'Ordonnance');
  const c = detail.data;
  return {
    consultation: c, loading: detail.isLoading,
    hasPrescription: !!c && c.stock.length + c.externes.length > 0,
    canInvoice: can('facturation', 'create') && !!c && !c.facture,
    canSeeInvoice: can('facturation', 'read') && !!c?.facture,
    canSend: can('ordonnances', 'update'),
    invoicing, startInvoice: () => setInvoicing(true), stopInvoice: () => setInvoicing(false),
    print: () => { if (c && !printOrdonnance(c)) toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); },
    channel: send,
    prefill: c ? { patientId: c.patient?.id ?? '', consultationId: c.id, lignes: c.facturePropose } : undefined,
  };
}
