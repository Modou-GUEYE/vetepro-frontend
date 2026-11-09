import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { useSessionStore } from '@/core/auth/session.store';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { useDebounce } from '@/core/utils/useDebounce';
import { toast } from '@/shared/ui';
import { UserForm, UserRow, fullName } from '../models/administration';
import { administrationService } from '../services/administration.service';

export type UserConfirm = { kind: 'deactivate' | 'delete'; user: UserRow } | null;

export function useUsersViewModel() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [profil, setProfil] = useState('');
  const currentUserId = useSessionStore((st) => st.user?.id);
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<'new' | UserRow | null>(null);
  const [rightsTarget, setRightsTarget] = useState<UserRow | null>(null);
  const [confirm, setConfirm] = useState<UserConfirm>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['users', { q, statut, profil, page }],
    queryFn: () => administrationService.listUsers({ page, pageSize: DEFAULT_PAGE_SIZE, q, statut, profil }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const save = useMutation({
    mutationFn: async (form: UserForm) => {
      if (formTarget && formTarget !== 'new') {
        await administrationService.updateUser(formTarget.id, form);
        return 'Utilisateur modifié';
      }
      return (await administrationService.createUser(form)).message;
    },
    onSuccess: (message) => { toast.success(message); setFormTarget(null); void refresh(); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ user, active }: { user: UserRow; active: boolean }) => administrationService.setActive(user.id, active),
    onSuccess: (_d, { user, active }) => { toast.success(`${fullName(user)} : compte ${active ? 'activé' : 'désactivé'}`); setConfirm(null); void refresh(); },
    onError: () => setConfirm(null),
  });

  const remove = useMutation({
    mutationFn: (user: UserRow) => administrationService.deleteUser(user.id),
    onSuccess: (_d, user) => { toast.success(`${fullName(user)} : compte supprimé`); setConfirm(null); void refresh(); },
    onError: () => setConfirm(null),
  });

  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    users: list.data?.items ?? [], total: list.data?.total ?? 0, loading: list.isLoading, page, pageSize: DEFAULT_PAGE_SIZE,
    setPage, search, setSearch: onFilter(setSearch), statut, setStatut: onFilter(setStatut), profil, setProfil: onFilter(setProfil), currentUserId,
    canCreate: can('utilisateurs', 'create'), canEdit: can('utilisateurs', 'update'), canDelete: can('utilisateurs', 'delete'), canRights: can('habilitations', 'update'),
    formTarget, openForm: setFormTarget, closeForm: () => setFormTarget(null),
    saving: save.isPending, submitForm: (f: UserForm) => save.mutate(f),
    rightsTarget, openRights: setRightsTarget, closeRights: () => setRightsTarget(null),
    confirm, askDeactivate: (user: UserRow) => setConfirm({ kind: 'deactivate', user }), askDelete: (user: UserRow) => setConfirm({ kind: 'delete', user }),
    cancelConfirm: () => setConfirm(null),
    activate: (user: UserRow) => toggleActive.mutate({ user, active: true }),
    confirming: toggleActive.isPending || remove.isPending,
    runConfirm: () => {
      if (!confirm) return;
      if (confirm.kind === 'delete') remove.mutate(confirm.user);
      else toggleActive.mutate({ user: confirm.user, active: false });
    },
    afterRights: () => { setRightsTarget(null); void refresh(); },
  };
}
