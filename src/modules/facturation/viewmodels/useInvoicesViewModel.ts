import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { useDebounce } from '@/core/utils/useDebounce';
import { facturationService } from '../services/facturation.service';

export function useInvoicesViewModel() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['invoices', { q, statut, du, au, page }],
    queryFn: () => facturationService.list({ page, pageSize: DEFAULT_PAGE_SIZE, q, statut, du, au }),
    placeholderData: keepPreviousData,
  });
  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    invoices: list.data?.items ?? [], total: list.data?.total ?? 0, stats: list.data?.stats, loading: list.isLoading, page, pageSize: DEFAULT_PAGE_SIZE, setPage,
    search, setSearch: filter(setSearch), statut, setStatut: filter(setStatut), du, setDu: filter(setDu), au, setAu: filter(setAu),
    canCreate: can('facturation', 'create'), canPay: can('facturation', 'update'), canCredit: can('facturation', 'delete'),
    creating, openCreate: () => setCreating(true), closeCreate: () => setCreating(false),
    detailId, openDetail: setDetailId, closeDetail: () => setDetailId(null),
    onCreated: (id: string) => { setCreating(false); setDetailId(id); },
  };
}
