import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Reclamation } from '../models/association';
import { associationService } from '../services/association.service';
import { useAssoMutation } from './useAssoMutation';

export function useReclamationsViewModel() {
  const [detail, setDetail] = useState<Reclamation | null>(null);
  const list = useQuery({ queryKey: ['asso', 'reclamations'], queryFn: associationService.reclamations });
  const setStatut = useAssoMutation(({ id, statut }: { id: string; statut: string }) => associationService.setReclamationStatut(id, statut).then(() => statut), {
    invalidate: [['asso', 'reclamations'], ['asso', 'reseau'], ['asso', 'journal'], ['support']], success: 'Statut mis à jour',
    onDone: (statut) => setDetail((d) => (d ? { ...d, statut: statut as Reclamation['statut'] } : d)),
  });
  return { items: list.data?.items ?? [], adresse: list.data?.adresse_support ?? '', loading: list.isLoading, detail, openDetail: setDetail, closeDetail: () => setDetail(null), setStatut: (id: string, statut: string) => setStatut.mutate({ id, statut }), updating: setStatut.isPending };
}
