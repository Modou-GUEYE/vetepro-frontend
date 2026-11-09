import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { useDebounce } from '@/core/utils/useDebounce';
import { consultationsService } from '../services/consultations.service';

/** Liste des consultations (page Consultations) ou des ordonnances (page Ordonnances, mêmes lignes avec au moins un médicament). */
export function useConsultationsViewModel(mode: 'consultations' | 'ordonnances' = 'consultations') {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['consultations', mode, { q, date, page }],
    queryFn: () => (mode === 'ordonnances'
      ? consultationsService.listPrescriptions({ page, pageSize: DEFAULT_PAGE_SIZE, q })
      : consultationsService.list({ page, pageSize: DEFAULT_PAGE_SIZE, q, date })),
    placeholderData: keepPreviousData,
  });
  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    rows: list.data?.items ?? [], total: list.data?.total ?? 0, loading: list.isLoading, page, setPage, pageSize: DEFAULT_PAGE_SIZE,
    search, setSearch: filter(setSearch), date, setDate: filter(setDate),
    canCreate: can('consultations', 'create'),
    creating, openCreate: () => setCreating(true), closeCreate: () => setCreating(false),
    detailId, openDetail: setDetailId, closeDetail: () => setDetailId(null),
    onCreated: (id: string) => { setCreating(false); setDetailId(id); },
  };
}

export const usePatientConsultations = (patientId: string | undefined) =>
  useQuery({ queryKey: ['consultations', 'patient', patientId], queryFn: () => consultationsService.list({ page: 1, pageSize: 50, patient: patientId }), enabled: !!patientId });
