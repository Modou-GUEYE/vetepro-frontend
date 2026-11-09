import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/shared/ui';
import { CANAL_LABEL, Canal } from '../models/notification';
import { notificationsService } from '../services/notifications.service';

/** Envoi d'un document (ordonnance, reçu) au propriétaire par le canal choisi. */
export function useSendDocument(path: string, label: string) {
  const [canal, setCanal] = useState<Canal>('email');
  const send = useMutation({
    mutationFn: () => notificationsService.send(path, canal),
    onSuccess: (to) => toast.success(`${label} envoyé par ${CANAL_LABEL[canal]} à ${to}`),
  });
  return { canal, setCanal, send: () => send.mutate(), sending: send.isPending };
}
