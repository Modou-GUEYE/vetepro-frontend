import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { unprocessableMessage } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { EpiFilters, EpiForm, emptyEpiFilters } from '../models/reseau';
import { reseauService } from '../services/reseau.service';

const KEY = ['reseau-epi'];

/** Pastille du menu : foyers actifs, relus chaque minute. */
export function useEpidemiesActives() {
  const can = useCan();
  const q = useQuery({ queryKey: ['reseau-epi-actifs'], queryFn: reseauService.activeCount, refetchInterval: 60_000, staleTime: 15_000, enabled: can('reseau') });
  return q.data ?? 0;
}

/** Veille épidémiologique : foyers signalés par le réseau, alerte automatique, signalement et clôture d'un foyer. */
export function useEpidemioViewModel() {
  const can = useCan();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EpiFilters>(emptyEpiFilters());
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const list = useQuery({ queryKey: [...KEY, filters], queryFn: () => reseauService.listEpidemies(filters) });
  const especes = useQuery({ queryKey: ['reseau-especes'], queryFn: reseauService.especes, staleTime: 5 * 60_000 });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: KEY }); void queryClient.invalidateQueries({ queryKey: ['reseau-epi-actifs'] }); };
  const onError = (e: unknown) => { const m = unprocessableMessage(e); if (m) toast.error(m); };

  const report = useMutation({
    mutationFn: (f: EpiForm) => reseauService.report(f),
    onSuccess: (e) => { setComposing(false); toast.success(e.alerte_declenchee ? `Foyer signalé, alerte réseau déclenchée pour ${e.maladie} à ${e.ville}` : 'Foyer signalé au réseau'); refresh(); },
    onError,
  });
  const resolve = useMutation({ mutationFn: reseauService.resolve, onSuccess: () => { toast.success('Foyer marqué comme résolu'); setOpenId(null); refresh(); }, onError });

  const items = list.data?.items ?? [];
  return {
    foyers: items, stats: list.data?.stats, alertes: list.data?.alertes ?? [], especes: especes.data ?? [], loading: list.isLoading, canReport: can('reseau', 'create'),
    filters, setFilter: <K extends keyof EpiFilters>(k: K, v: EpiFilters[K]) => setFilters((f) => ({ ...f, [k]: v })), resetFilters: () => setFilters(emptyEpiFilters()),
    selected: items.find((e) => e.id === openId) ?? null, open: (id: string) => setOpenId(id), closeDetail: () => setOpenId(null),
    composing, openComposer: () => setComposing(true), closeComposer: () => setComposing(false),
    report: (f: EpiForm) => report.mutateAsync(f).catch(() => undefined), reporting: report.isPending,
    resolve: (id: string) => resolve.mutate(id), resolving: resolve.isPending,
  };
}
