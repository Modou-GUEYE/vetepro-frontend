import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { useDebounce } from '@/core/utils/useDebounce';
import { hospiService } from '../services/hospi.service';

export type HospiTab = 'encours' | 'sorti';

export function useHospisViewModel() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<HospiTab>('encours');
  const [search, setSearch] = useState('');
  const [admitting, setAdmitting] = useState(false);
  const q = useDebounce(search);
  const list = useQuery({ queryKey: ['hospis', tab, q], queryFn: () => hospiService.list(tab, q), placeholderData: keepPreviousData });
  const detailId = params.get('id');
  const setId = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set('id', id); else n.delete('id'); setParams(n, { replace: true }); };

  return {
    tab, setTab, search, setSearch, rows: list.data?.items ?? [], stats: list.data?.stats, loading: list.isLoading,
    canCreate: can('hospitalisations', 'create'),
    admitting, openAdmit: () => setAdmitting(true), closeAdmit: () => setAdmitting(false),
    detailId, openDetail: (id: string) => setId(id), closeDetail: () => setId(null),
  };
}
