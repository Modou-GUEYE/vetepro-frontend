import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Action, ModuleKey, Overrides, cellState, countOverrides, toggleOverride } from '@/core/auth/permissions';
import { toast } from '@/shared/ui';
import { UserRow, fullName } from '../models/administration';
import { administrationService } from '../services/administration.service';
import { useProfilesQuery } from './useProfilesQuery';

/** Droits d'un utilisateur : profil + exceptions. Chaque case affiche le droit effectif et d'où il vient. */
export function useUserRightsViewModel(user: UserRow, onSaved: () => void) {
  const queryClient = useQueryClient();
  const profiles = useProfilesQuery();
  const detail = useQuery({ queryKey: ['users', 'detail', user.id], queryFn: () => administrationService.getUser(user.id) });
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => { if (detail.data) setOverrides(detail.data.exceptions); }, [detail.data]);

  const base = profiles.data?.find((p) => p.id === user.profilId)?.permissions ?? {};

  const save = useMutation({
    mutationFn: () => administrationService.saveExceptions(user.id, overrides),
    onSuccess: () => {
      toast.success(`Habilitations de ${fullName(user)} enregistrées, effet immédiat`);
      void queryClient.invalidateQueries({ queryKey: ['me'] }); // si c'est mon propre compte, mes droits sont relus tout de suite
      onSaved();
    },
  });

  return {
    loading: detail.isLoading || profiles.isLoading,
    profilLabel: user.profilLabel,
    cell: (m: ModuleKey, a: Action) => cellState(base, overrides, m, a),
    toggle: (m: ModuleKey, a: Action) => setOverrides((o) => toggleOverride(base, o, m, a)),
    reset: () => setOverrides({}),
    exceptionsCount: countOverrides(overrides),
    saving: save.isPending,
    save: () => save.mutate(),
  };
}
