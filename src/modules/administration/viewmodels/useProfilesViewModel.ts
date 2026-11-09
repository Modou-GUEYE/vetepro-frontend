import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ACTIONS, Action, MODULES, ModuleKey, PermissionMap, useCan } from '@/core/auth/permissions';
import { toast } from '@/shared/ui';
import { administrationService } from '../services/administration.service';
import { useProfilesQuery } from './useProfilesQuery';

const same = (a: PermissionMap, b: PermissionMap) =>
  MODULES.every((m) => ACTIONS.every((x) => (a[m]?.includes(x) ?? false) === (b[m]?.includes(x) ?? false)));

/** Le profil Administrateur garde toujours tous les droits sur les utilisateurs et les habilitations. */
export const isLockedCell = (profileId: string, m: ModuleKey) => profileId === 'admin' && (m === 'utilisateurs' || m === 'habilitations');

export function useProfilesViewModel() {
  const queryClient = useQueryClient();
  const can = useCan();
  const profiles = useProfilesQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionMap>({});
  const [duplicating, setDuplicating] = useState(false);
  const [label, setLabel] = useState('');

  const list = profiles.data ?? [];
  const selected = list.find((p) => p.id === selectedId) ?? list[0];

  useEffect(() => { if (selected) setDraft(selected.permissions); }, [selected?.id, selected?.permissions]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => (selected ? !same(draft, selected.permissions) : false), [draft, selected]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    void queryClient.invalidateQueries({ queryKey: ['users'] });
    void queryClient.invalidateQueries({ queryKey: ['me'] }); // mes propres droits peuvent avoir changé
  };

  const save = useMutation({
    mutationFn: () => administrationService.savePermissions(selected!.id, draft),
    onSuccess: () => { toast.success(`Profil « ${selected?.label} » enregistré, effet immédiat pour ses utilisateurs`); refresh(); },
  });

  const duplicate = useMutation({
    mutationFn: () => administrationService.duplicateProfile(selected!.id, label),
    onSuccess: (p) => { toast.success(`Profil « ${p.label} » créé`); setDuplicating(false); setLabel(''); setSelectedId(p.id); refresh(); },
  });

  return {
    profiles: list, loading: profiles.isLoading, selected, select: setSelectedId,
    cell: (m: ModuleKey, a: Action) => ({ on: draft[m]?.includes(a) ?? false, origin: 'inherit' as const }),
    locked: (m: ModuleKey) => (selected ? isLockedCell(selected.id, m) : false),
    toggle: (m: ModuleKey, a: Action) => {
      if (!selected || isLockedCell(selected.id, m)) return;
      setDraft((d) => {
        const has = d[m]?.includes(a) ?? false;
        const next = has ? (d[m] ?? []).filter((x) => x !== a) : [...(d[m] ?? []), a];
        const out = { ...d, [m]: ACTIONS.filter((x) => next.includes(x)) };
        if (out[m]!.length === 0) delete out[m];
        return out;
      });
    },
    dirty, saving: save.isPending, save: () => save.mutate(), discard: () => selected && setDraft(selected.permissions),
    canEdit: can('habilitations', 'update'), canDuplicate: can('habilitations', 'create'),
    duplicating, openDuplicate: () => { setLabel(''); setDuplicating(true); }, closeDuplicate: () => setDuplicating(false),
    label, setLabel, duplicateBusy: duplicate.isPending, submitDuplicate: () => duplicate.mutate(),
  };
}
