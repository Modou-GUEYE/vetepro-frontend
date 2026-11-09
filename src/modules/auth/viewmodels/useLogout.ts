import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/core/auth/session.store';
import { authService } from '../services/auth.service';

/** Déconnexion : ferme la session côté serveur (sans attendre), vide l'état local et revient à l'écran de connexion. */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return () => {
    const { refreshToken, clear } = useSessionStore.getState();
    void authService.logout(refreshToken).catch(() => undefined);
    clear();
    queryClient.clear();
    navigate('/connexion', { replace: true, state: { loggedOut: true } });
  };
}
