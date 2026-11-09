import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { useDebounce } from '@/core/utils/useDebounce';
import { toast } from '@/shared/ui';
import { PatientForm, PatientType } from '../models/patient';
import { patientsService } from '../services/patients.service';

export type PatientTab = 'dossier' | 'consultations' | 'vaccins' | 'historique';

export function usePatientsViewModel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const can = useCan();
  const { id: selectedId } = useParams();
  const [params, setParams] = useSearchParams();
  const ownerFilter = params.get('proprietaire') ?? '';
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | PatientType>('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<PatientTab>('dossier');
  const [formTarget, setFormTarget] = useState<{ mode: 'new'; type: PatientType } | { mode: 'edit' } | null>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['patients', { q, type, ownerFilter, page }],
    queryFn: () => patientsService.list({ page, pageSize: DEFAULT_PAGE_SIZE, q, type, proprietaire: ownerFilter }),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({ queryKey: ['patient', selectedId], queryFn: () => patientsService.get(selectedId!), enabled: !!selectedId });

  const save = useMutation({
    mutationFn: (f: PatientForm) => (formTarget?.mode === 'edit' && selectedId ? patientsService.update(selectedId, f) : patientsService.create(f)),
    onSuccess: (p) => {
      const created = formTarget?.mode === 'new';
      toast.success(created ? `Dossier créé : ${p.matricule}` : 'Dossier modifié, historique mis à jour');
      setFormTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      void queryClient.invalidateQueries({ queryKey: ['owners'] }); // le nombre d'animaux change
      void queryClient.invalidateQueries({ queryKey: ['patient', p.id] });
      if (created) { setTab('dossier'); navigate(`/patients/${p.id}`); }
    },
  });

  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const select = (id: string) => { setTab('dossier'); navigate({ pathname: `/patients/${id}`, search: params.toString() }); };

  return {
    patients: list.data?.items ?? [], total: list.data?.total ?? 0, loading: list.isLoading, page, pageSize: DEFAULT_PAGE_SIZE, setPage,
    search, setSearch: filter(setSearch), type, setType: filter(setType),
    ownerFilter, ownerFilterName: list.data?.items.find((p) => p.proprietaire?.id === ownerFilter)?.proprietaire?.nom,
    clearOwnerFilter: () => { const p = new URLSearchParams(params); p.delete('proprietaire'); setParams(p); setPage(1); },
    selectedId, select, detail: detail.data, detailLoading: detail.isLoading && !!selectedId, detailError: detail.isError,
    tab, setTab,
    canCreate: can('patients', 'create'), canEdit: can('patients', 'update'),
    formTarget, openNew: (t: PatientType = 'animal') => setFormTarget({ mode: 'new', type: t }), openEdit: () => setFormTarget({ mode: 'edit' }), closeForm: () => setFormTarget(null),
    saving: save.isPending, submitForm: (f: PatientForm) => save.mutate(f),
  };
}
