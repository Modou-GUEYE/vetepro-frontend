import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/core/utils/useDebounce';
import { Cv, CvFilters, EMPTY_FILTERS, cvStats, villesOf } from '../models/cv';
import { cvthequeService } from '../services/cvtheque.service';

/** Consultation des profils validés par l'association : liste, filtres et fiche candidat. */
export function useCvthequeViewModel() {
  const [filters, setFilters] = useState<CvFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Cv | null>(null);
  const debounced = useDebounce(filters, 250);
  const list = useQuery({ queryKey: ['cvtheque', debounced], queryFn: () => cvthequeService.search(debounced), placeholderData: keepPreviousData });
  // Tous les profils visibles : alimente les chiffres du bandeau et la liste des villes, sans tenir compte des filtres.
  const all = useQuery({ queryKey: ['cvtheque', EMPTY_FILTERS], queryFn: () => cvthequeService.search(EMPTY_FILTERS) });
  const download = useMutation({ mutationFn: cvthequeService.download });
  return {
    stats: cvStats(all.data ?? []), villes: villesOf(all.data ?? []),
    download: download.mutate, downloading: download.isPending,
    items: list.data ?? [], loading: list.isLoading, filters, setFilter: (k: keyof CvFilters, v: string) => setFilters((f) => ({ ...f, [k]: v })), reset: () => setFilters(EMPTY_FILTERS),
    selected, open: setSelected, close: () => setSelected(null),
  };
}
