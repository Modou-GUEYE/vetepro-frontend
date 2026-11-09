import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { toast } from '@/shared/ui';
import { rdvService } from '../services/rdv.service';

export function useRdvDetailViewModel(id: string) {
  const can = useCan();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const detail = useQuery({ queryKey: ['rdv', 'detail', id], queryFn: () => rdvService.get(id) });
  const refresh = () => { for (const k of ['rdv', 'rdv-slots', 'notifications', 'patient-choices', 'patients']) void queryClient.invalidateQueries({ queryKey: [k] }); };

  const cancel = useMutation({
    mutationFn: () => rdvService.cancel(id),
    onSuccess: (r) => {
      setConfirmCancel(false);
      toast[r.envoi?.statut === 'echec' ? 'warning' : 'success'](r.envoi?.statut === 'echec' ? `Rendez-vous annulé, message non envoyé : ${r.envoi.erreur}` : 'Rendez-vous annulé, le propriétaire est prévenu');
      refresh();
    },
  });
  const resend = useMutation({ mutationFn: () => rdvService.resend(id), onSuccess: () => { toast.success('Message renvoyé'); refresh(); } });
  const complete = useMutation({
    mutationFn: (consultationId: string) => rdvService.complete(id, consultationId),
    onSuccess: () => { setConsulting(false); toast.success('Consultation enregistrée, rendez-vous terminé'); for (const k of ['consultations', 'pharmacy']) void queryClient.invalidateQueries({ queryKey: [k] }); refresh(); },
  });

  const r = detail.data;
  const editable = !!r && r.statut === 'confirme' && !r.passe;
  return {
    rdv: r, loading: detail.isLoading,
    canEdit: editable && can('rdv', 'update'), canCancel: !!r && r.statut === 'confirme' && can('rdv', 'delete'),
    canStart: !!r && r.statut === 'confirme' && !!r.patient && can('consultations', 'create'),
    canResend: can('rdv', 'update'),
    confirmCancel, askCancel: () => setConfirmCancel(true), dismissCancel: () => setConfirmCancel(false), cancel: () => cancel.mutate(), cancelling: cancel.isPending,
    resend: () => resend.mutate(), resending: resend.isPending,
    consulting, startConsultation: () => setConsulting(true), stopConsultation: () => setConsulting(false), onConsulted: (cid: string) => complete.mutate(cid),
  };
}
