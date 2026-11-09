import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { toast } from '@/shared/ui';
import { Espece, Race, parseGestation } from '../models/referentiels';
import { referentielsService } from '../services/referentiels.service';

export function useSpeciesViewModel() {
  const queryClient = useQueryClient();
  const can = useCan();
  const list = useQuery({ queryKey: ['especes'], queryFn: referentielsService.listEspeces });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gestation, setGestation] = useState('');
  const [confirmOff, setConfirmOff] = useState<Espece | null>(null);

  const all = list.data ?? [];
  const selected = all.find((e) => e.id === selectedId) ?? all[0];
  const q = search.trim().toLowerCase();
  const species = all
    .filter((e) => filter === 'all' || (filter === 'actif' ? e.actif : !e.actif))
    .filter((e) => !q || e.nom.toLowerCase().includes(q) || e.races.some((r) => r.nom.toLowerCase().includes(q)));

  const kpis = {
    total: all.length, actives: all.filter((e) => e.actif).length, inactives: all.filter((e) => !e.actif).length,
    racesActives: all.reduce((n, e) => n + e.races.filter((r) => r.actif).length, 0),
  };

  useEffect(() => { setGestation(selected?.gestationJours?.toString() ?? ''); }, [selected?.id, selected?.gestationJours]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['especes'] });

  const toggleSpecies = useMutation({
    mutationFn: ({ e, active }: { e: Espece; active: boolean }) => referentielsService.setEspeceActive(e.id, active),
    onSuccess: (_d, { e, active }) => { toast.success(`${e.nom} ${active ? 'activé' : 'désactivé'}`); setConfirmOff(null); void refresh(); },
    onError: () => setConfirmOff(null),
  });

  const toggleRace = useMutation({
    mutationFn: ({ r, active }: { r: Race; active: boolean }) => referentielsService.setRaceActive(r.id, active),
    onSuccess: () => void refresh(),
  });

  const parsed = parseGestation(gestation);
  const dirty = !!selected && parsed.ok && parsed.jours !== selected.gestationJours;

  const saveGestation = useMutation({
    mutationFn: () => referentielsService.setGestation(selected!.id, parsed.ok ? parsed.jours : null),
    onSuccess: () => { toast.success(`Durée de gestation enregistrée (${selected?.nom})`); void refresh(); },
  });

  return {
    species, kpis, total: all.length, loading: list.isLoading, selected, filter, setFilter, search, setSearch,
    drawerOpen, openDetail: (id: string) => { setSelectedId(id); setDrawerOpen(true); }, closeDetail: () => setDrawerOpen(false),
    canEdit: can('referentiels', 'update'),
    activeRaces: selected?.races.filter((r) => r.actif).length ?? 0,
    requestToggle: (e: Espece) => (e.actif ? setConfirmOff(e) : toggleSpecies.mutate({ e, active: true })),
    confirmOff, cancelOff: () => setConfirmOff(null), confirmDeactivate: () => confirmOff && toggleSpecies.mutate({ e: confirmOff, active: false }),
    busy: toggleSpecies.isPending,
    toggleRace: (r: Race) => toggleRace.mutate({ r, active: !r.actif }),
    gestation, setGestation, gestationError: parsed.ok ? undefined : parsed.message, gestationDirty: dirty,
    savingGestation: saveGestation.isPending, saveGestation: () => saveGestation.mutate(),
  };
}
