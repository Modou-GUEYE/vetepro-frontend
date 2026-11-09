import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/core/auth/session.store';
import { authService } from '@/modules/auth/services/auth.service';

export const PERMISSIONS_STALE_EVENT = 'vetepro:permissions-stale';

/**
 * Relit les droits et l'abonnement : au retour sur l'onglet, chaque minute, et dès qu'une action est refusée.
 * Un changement fait par l'Administrateur s'applique ainsi sans nouvelle connexion.
 */
export function useSessionSync() {
  const setAccess = useSessionStore((s) => s.setAccess);
  const { data, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  useEffect(() => { if (data) setAccess(data); }, [data, setAccess]);

  useEffect(() => {
    const onStale = () => void refetch();
    window.addEventListener(PERMISSIONS_STALE_EVENT, onStale);
    return () => window.removeEventListener(PERMISSIONS_STALE_EVENT, onStale);
  }, [refetch]);
}
