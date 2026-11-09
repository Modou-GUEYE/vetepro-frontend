import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Cv, CvAction } from '../models/association';
import { associationService } from '../services/association.service';
import { useAssoMutation } from './useAssoMutation';

const MESSAGES: Record<CvAction, string> = { valider: 'Profil validé, il est visible des cabinets membres', archiver: 'Profil archivé', restaurer: 'Profil remis à valider' };

export function useCvAssociationViewModel() {
  const [statut, setStatut] = useState('');
  const [detail, setDetail] = useState<Cv | null>(null);
  const list = useQuery({ queryKey: ['asso', 'cvs', statut], queryFn: () => associationService.cvs(statut) });
  const review = useAssoMutation(({ id, action }: { id: string; action: CvAction }) => associationService.reviewCv(id, action).then((cv) => ({ cv, action })), {
    invalidate: [['asso', 'cvs'], ['asso', 'reseau'], ['asso', 'journal']], success: (r) => MESSAGES[r.action], onDone: () => setDetail(null),
  });
  const download = useMutation({ mutationFn: associationService.download });
  return { download: download.mutate, downloading: download.isPending, statut, setStatut, cvs: list.data ?? [], loading: list.isLoading, detail, openDetail: setDetail, closeDetail: () => setDetail(null), review: (id: string, action: CvAction) => review.mutate({ id, action }), reviewing: review.isPending };
}
