import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { useDebounce } from '@/core/utils/useDebounce';
import { toast } from '@/shared/ui';
import { Service, ServiceForm } from '../models/referentiels';
import { referentielsService } from '../services/referentiels.service';

export type ServiceConfirm = { kind: 'deactivate' | 'delete'; service: Service } | null;

export function useServicesViewModel() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<'new' | Service | null>(null);
  const [confirm, setConfirm] = useState<ServiceConfirm>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['services', { q, categorie, statut, page }],
    queryFn: () => referentielsService.listServices({ page, pageSize: DEFAULT_PAGE_SIZE, q, categorie, statut }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const save = useMutation({
    mutationFn: async (f: ServiceForm) => {
      if (formTarget && formTarget !== 'new') { await referentielsService.updateService(formTarget.id, f); return 'Service modifié'; }
      await referentielsService.createService(f);
      return 'Service créé';
    },
    onSuccess: (m) => { toast.success(m); setFormTarget(null); void refresh(); },
  });

  const toggle = useMutation({
    mutationFn: ({ s, active }: { s: Service; active: boolean }) => referentielsService.setServiceActive(s.id, active),
    onSuccess: (_d, { s, active }) => { toast.success(`« ${s.libelle} » ${active ? 'activé' : 'désactivé'}`); setConfirm(null); void refresh(); },
    onError: () => setConfirm(null),
  });

  const remove = useMutation({
    mutationFn: (s: Service) => referentielsService.deleteService(s.id),
    onSuccess: (_d, s) => { toast.success(`« ${s.libelle} » supprimé`); setConfirm(null); void refresh(); },
    onError: () => setConfirm(null),
  });

  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    services: list.data?.items ?? [], stats: list.data?.stats, categories: list.data?.categories ?? [], total: list.data?.total ?? 0,
    loading: list.isLoading, page, pageSize: DEFAULT_PAGE_SIZE, setPage,
    search, setSearch: filter(setSearch), categorie, setCategorie: filter(setCategorie), statut, setStatut: filter(setStatut),
    canCreate: can('services', 'create'), canEdit: can('services', 'update'), canDelete: can('services', 'delete'),
    formTarget, openForm: setFormTarget, closeForm: () => setFormTarget(null), saving: save.isPending, submitForm: (f: ServiceForm) => save.mutate(f),
    confirm, askDeactivate: (service: Service) => setConfirm({ kind: 'deactivate', service }), askDelete: (service: Service) => setConfirm({ kind: 'delete', service }),
    cancelConfirm: () => setConfirm(null), activate: (s: Service) => toggle.mutate({ s, active: true }),
    confirming: toggle.isPending || remove.isPending,
    runConfirm: () => {
      if (!confirm) return;
      if (confirm.kind === 'delete') remove.mutate(confirm.service);
      else toggle.mutate({ s: confirm.service, active: false });
    },
  };
}
