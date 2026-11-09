import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { useDebounce } from '@/core/utils/useDebounce';
import { Acte, ActeFilters, QuickFilter, emptyFilters } from '../models/insemination';
import { inseminationService } from '../services/insemination.service';

export type InsemTab = 'actes' | 'suivi' | 'rappels';
export type InsemDialog = { kind: 'form'; acte?: Acte } | { kind: 'diagnostic' | 'mise-bas' | 'delete'; acte: Acte } | null;

export function useInseminationViewModel() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const tab: InsemTab = params.get('onglet') === 'suivi' ? 'suivi' : params.get('onglet') === 'rappels' ? 'rappels' : 'actes';
  const setTab = (t: InsemTab) => { const n = new URLSearchParams(params); if (t !== 'actes') n.set('onglet', t); else n.delete('onglet'); setParams(n, { replace: true }); };
  const [filters, setFilters] = useState<ActeFilters>(emptyFilters());
  const [dialog, setDialog] = useState<InsemDialog>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const q = useDebounce(filters.q);
  const effective = { ...filters, q };

  const list = useQuery({ queryKey: ['inseminations', effective], queryFn: () => inseminationService.list(effective), placeholderData: keepPreviousData });
  const suivi = useQuery({ queryKey: ['gestations'], queryFn: inseminationService.gestations });
  const rappels = useQuery({ queryKey: ['inseminations', 'rappels'], queryFn: inseminationService.rappels, enabled: tab === 'rappels' });
  const set = <K extends keyof ActeFilters>(k: K) => (v: ActeFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return {
    tab, setTab, filters, set, setQuick: (f: QuickFilter) => set('filtre')(f), reset: () => setFilters(emptyFilters()),
    rows: list.data?.items ?? [], stats: list.data?.stats, loading: list.isLoading, gestations: suivi.data ?? [], gestationsLoading: suivi.isLoading,
    rappels: rappels.data?.items ?? [], rappelsInfo: rappels.data, rappelsLoading: rappels.isLoading,
    canCreate: can('insemination', 'create'), canUpdate: can('insemination', 'update'), canDelete: can('insemination', 'delete'), canInvoice: can('facturation', 'read'), canPay: can('facturation', 'update'),
    dialog, openForm: (acte?: Acte) => setDialog({ kind: 'form', acte }), open: (kind: 'diagnostic' | 'mise-bas' | 'delete', acte: Acte) => setDialog({ kind, acte }), close: () => setDialog(null),
    invoiceId, openInvoice: setInvoiceId, closeInvoice: () => setInvoiceId(null),
  };
}
