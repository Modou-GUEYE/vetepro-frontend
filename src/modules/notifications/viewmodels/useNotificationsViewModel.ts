import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AppNotification } from '../models/notification';
import { notificationsService } from '../services/notifications.service';

const KEY = ['notifications'];

/** Cloche de l'en-tête : liste, compteur de non lus (rafraîchi toutes les minutes), ouverture de l'élément concerné. */
export function useNotificationsViewModel() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: KEY, queryFn: notificationsService.list, refetchInterval: 60_000, staleTime: 15_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const markRead = useMutation({ mutationFn: notificationsService.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsService.markAllRead, onSuccess: refresh });

  return {
    items: list.data?.items ?? [], unread: list.data?.unread ?? 0, loading: list.isLoading,
    open, toggle: () => { setOpen((v) => !v); if (!open) void refresh(); }, close: () => setOpen(false),
    markAll: () => markAll.mutate(),
    openItem: (n: AppNotification) => { if (!n.lu) markRead.mutate(n.id); setOpen(false); navigate(n.lien); },
  };
}
