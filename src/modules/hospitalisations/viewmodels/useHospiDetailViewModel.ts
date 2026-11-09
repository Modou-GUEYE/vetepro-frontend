import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { hospiService } from '../services/hospi.service';

export type HospiDialog = 'edit' | 'prescribe' | 'exit' | 'invoice' | null;

export function useHospiDetailViewModel(id: string) {
  const can = useCan();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<HospiDialog>(null);
  const detail = useQuery({ queryKey: ['hospi', id], queryFn: () => hospiService.get(id) });
  const h = detail.data;
  const refresh = () => { for (const k of ['hospi', 'hospis', 'pharmacy', 'invoices', 'patients', 'patient-choices', 'notifications']) void queryClient.invalidateQueries({ queryKey: [k] }); };
  const active = h?.statut === 'encours';
  return {
    hospi: h, loading: detail.isLoading, refresh,
    canEdit: active && can('hospitalisations', 'update'), canSeeInvoice: can('facturation', 'read') && !!h?.sortie?.facture,
    dialog, open: setDialog, close: () => setDialog(null),
  };
}
