import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cabinet } from '@/modules/abonnement/services/abonnement.service';
import { Registration } from '@/modules/abonnement/models/abonnement';
import { associationService } from '../services/association.service';
import { useAssoMutation } from './useAssoMutation';

export type ReseauTab = 'cabinets' | 'journal';
const REFRESH = [['asso', 'reseau'], ['asso', 'cabinets'], ['asso', 'journal'], ['asso', 'offres']];

export function useReseauViewModel() {
  const [tab, setTab] = useState<ReseauTab>('cabinets');
  const [statut, setStatut] = useState('');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<Cabinet | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Registration | null>(null);

  const stats = useQuery({ queryKey: ['asso', 'reseau'], queryFn: associationService.reseau });
  const cabinets = useQuery({ queryKey: ['asso', 'cabinets', statut, q], queryFn: () => associationService.cabinets({ statut, q }), placeholderData: (p) => p });
  const journal = useQuery({ queryKey: ['asso', 'journal'], queryFn: associationService.journal, enabled: tab === 'journal' });

  const extend = useAssoMutation(({ id, jours }: { id: string; jours: number }) => associationService.extend(id, jours), {
    invalidate: REFRESH, success: 'Abonnement prolongé', onDone: () => setDetail(null),
  });
  const create = useAssoMutation(associationService.createEntity, {
    invalidate: REFRESH, success: 'Entité créée, identifiants envoyés', onDone: (r) => { setCreating(false); setCreated(r); },
  });

  return {
    tab, setTab, statut, setStatut, q, setQ, stats: stats.data, cabinets: cabinets.data ?? [], loading: cabinets.isLoading, journal: journal.data ?? [], journalLoading: journal.isLoading,
    detail, openDetail: setDetail, closeDetail: () => setDetail(null), creating, openCreate: () => setCreating(true), closeCreate: () => setCreating(false),
    created, closeCreated: () => setCreated(null), extend: extend.mutate, extending: extend.isPending, create: create.mutate, creatingPending: create.isPending,
  };
}
export type ReseauVm = ReturnType<typeof useReseauViewModel>;
