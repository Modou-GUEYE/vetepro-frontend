import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { unprocessableMessage } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { CasFilters, CasForm, emptyCasFilters } from '../models/reseau';
import { reseauService } from '../services/reseau.service';

const KEY = ['reseau-cas'];

/** Cas cliniques partagés : liste filtrée, partage d'un cas, avis des confrères, « Utile », clôture par l'auteur. */
export function useCasViewModel() {
  const can = useCan();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CasFilters>(emptyCasFilters());
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [formError, setFormError] = useState('');

  const list = useQuery({ queryKey: [...KEY, filters], queryFn: () => reseauService.listCas(filters) });
  const especes = useQuery({ queryKey: ['reseau-especes'], queryFn: reseauService.especes, staleTime: 5 * 60_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const onError = (e: unknown) => { const m = unprocessableMessage(e); if (m) toast.error(m); };

  const create = useMutation({
    mutationFn: reseauService.createCas,
    onSuccess: () => { setComposing(false); setFormError(''); toast.success('Cas partagé avec le réseau'); void refresh(); },
    onError: (e) => setFormError(unprocessableMessage(e) ?? ''),
  });
  const reply = useMutation({ mutationFn: (v: { id: string; texte: string }) => reseauService.reply(v.id, v.texte), onSuccess: () => { toast.success('Avis publié'); void refresh(); }, onError });
  const vote = useMutation({ mutationFn: reseauService.vote, onSuccess: () => void refresh(), onError });
  const close = useMutation({ mutationFn: reseauService.close, onSuccess: () => { toast.success('Cas marqué comme résolu'); void refresh(); }, onError });

  const items = list.data?.items ?? [];
  return {
    cas: items, especesCas: list.data?.especes ?? [], especes: especes.data ?? [], loading: list.isLoading, canShare: can('reseau', 'create'),
    filters, setFilter: <K extends keyof CasFilters>(k: K, v: CasFilters[K]) => setFilters((f) => ({ ...f, [k]: v })), resetFilters: () => setFilters(emptyCasFilters()),
    selected: items.find((c) => c.id === openId) ?? null, open: (id: string) => setOpenId(id), closeDetail: () => setOpenId(null),
    composing, openComposer: () => { setFormError(''); setComposing(true); }, closeComposer: () => setComposing(false), formError,
    share: (f: CasForm) => create.mutateAsync(f).catch(() => undefined), sharing: create.isPending,
    reply: (id: string, texte: string) => reply.mutateAsync({ id, texte }), replying: reply.isPending,
    toggleVote: (id: string) => vote.mutate(id), resolve: (id: string) => close.mutate(id), resolving: close.isPending,
  };
}
