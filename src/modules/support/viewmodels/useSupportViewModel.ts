import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { unprocessableMessage } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { Ticket } from '../models/ticket';
import { supportService } from '../services/support.service';

export function useSupportViewModel() {
  const can = useCan();
  const queryClient = useQueryClient();
  const [sent, setSent] = useState<Ticket | null>(null);
  const [detail, setDetail] = useState<Ticket | null>(null);
  const list = useQuery({ queryKey: ['support'], queryFn: supportService.list });
  const send = useMutation({
    mutationFn: supportService.create,
    onSuccess: (t) => { setSent(t); toast.success(`Réclamation ${t.numero} envoyée`); void queryClient.invalidateQueries({ queryKey: ['support'] }); },
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
  });
  return {
    tickets: list.data?.items ?? [], adresse: list.data?.adresse ?? '', loading: list.isLoading, canSend: can('support', 'create'),
    send: send.mutateAsync, sending: send.isPending, sent, clearSent: () => setSent(null), detail, openDetail: setDetail, closeDetail: () => setDetail(null),
  };
}
