import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { toApiError } from '@/core/http/errors';
import { useDebounce } from '@/core/utils/useDebounce';
import { toast } from '@/shared/ui';
import { Owner, OwnerForm, ownerFullName } from '../models/proprietaire';
import { proprietairesService } from '../services/proprietaires.service';

export type OwnerConfirm = { kind: 'deactivate' | 'delete'; owner: Owner } | null;

export function useOwnersViewModel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<'new' | Owner | null>(null);
  const [confirm, setConfirm] = useState<OwnerConfirm>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['owners', { q, statut, page }],
    queryFn: () => proprietairesService.list({ page, pageSize: DEFAULT_PAGE_SIZE, q, statut }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['owners'] });
    void queryClient.invalidateQueries({ queryKey: ['owner-choices'] });
  };

  const save = useMutation({
    mutationFn: async (f: OwnerForm) => {
      if (formTarget && formTarget !== 'new') { await proprietairesService.update(formTarget.id, f); return 'Propriétaire modifié'; }
      await proprietairesService.create(f);
      return 'Propriétaire ajouté';
    },
    onSuccess: (m) => { toast.success(m); setFormTarget(null); refresh(); },
  });

  const toggle = useMutation({
    mutationFn: ({ owner, active }: { owner: Owner; active: boolean }) => proprietairesService.setActive(owner.id, active),
    onSuccess: (_d, { owner, active }) => { toast.success(`${ownerFullName(owner)} : ${active ? 'activé' : 'désactivé'}`); setConfirm(null); refresh(); },
    onError: () => setConfirm(null),
  });

  const remove = useMutation({
    mutationFn: (owner: Owner) => proprietairesService.remove(owner.id),
    onSuccess: (_d, owner) => { toast.success(`${ownerFullName(owner)} supprimé`); setConfirm(null); refresh(); },
    onError: (e) => {
      const err = toApiError(e);
      setConfirm(null);
      if (err.code === 'owner_has_patients') setBlocked(err.message); // avertissement dédié, spécification
    },
  });

  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    owners: list.data?.items ?? [], total: list.data?.total ?? 0, loading: list.isLoading, page, pageSize: DEFAULT_PAGE_SIZE, setPage,
    search, setSearch: filter(setSearch), statut, setStatut: filter(setStatut),
    canCreate: can('proprietaires', 'create'), canEdit: can('proprietaires', 'update'), canDelete: can('proprietaires', 'delete'), canSeePatients: can('patients', 'read'),
    formTarget, openForm: setFormTarget, closeForm: () => setFormTarget(null), saving: save.isPending, submitForm: (f: OwnerForm) => save.mutate(f),
    confirm, askDeactivate: (owner: Owner) => setConfirm({ kind: 'deactivate', owner }), askDelete: (owner: Owner) => setConfirm({ kind: 'delete', owner }),
    cancelConfirm: () => setConfirm(null), activate: (owner: Owner) => toggle.mutate({ owner, active: true }),
    confirming: toggle.isPending || remove.isPending,
    runConfirm: () => {
      if (!confirm) return;
      if (confirm.kind === 'delete') remove.mutate(confirm.owner);
      else toggle.mutate({ owner: confirm.owner, active: false });
    },
    blocked, closeBlocked: () => setBlocked(null),
    seePatients: (owner: Owner) => navigate(`/patients?proprietaire=${owner.id}`),
  };
}
